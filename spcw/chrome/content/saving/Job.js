/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Archive Format.
 *
 * The Initial Developer of the Original Code is
 * Paolo Amadini <http://www.amadzone.org/>.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Provides the base class for implementing cancelable jobs with progress
 * indication. Derived objects must implement specific methods.
 *
 * @param aEventListener
 *        This object will receive the onJobComplete and onJobProgressChange
 *        events.
 */
function Job(aEventListener) {
  this._eventListener = aEventListener;

  // Initialize other member variables explicitly for proper inheritance.
  this.isCompleted = false;
  this.result = Cr.NS_OK;
  this.curJobProgress = 0;
  this.maxJobProgress = 0;
}

Job.prototype = {
  /**
   * True when the job is terminated. The job is considered terminated after
   * start() has been called and the operation is finished, or after cancel()
   * has been called.
   */
  isCompleted: false,

  /**
   * When isCompleted is true, contains the last result code of the job.
   */
  result: Cr.NS_OK,

  /**
   * Current job progress. This value is independent from the completion state,
   * and is usually less than or equal to the total job progress. Often this
   * value is interpreted as a byte count.
   */
  curJobProgress: 0,

  /**
   * Maximum reference value for the job progress. This value can be zero even
   * if the job is started. Often this value is interpreted as a byte count.
   */
  maxJobProgress: 0,

  /**
   * Start the operation.
   *
   * If this function succeeds, the onJobComplete event will be raised when the
   * operation terminates. If this function raises an exception, it is not
   * specified whether the onJobComplete event will be raised or not.
   */
  start: function() {
    // Never start a job more than once.
    if (this.isCompleted) {
      throw Components.Exception("Restart attempted after job completed.",
       Cr.NS_ERROR_ALREADY_INITIALIZED);
    }

    // If the start process fails, cancel the operation.
    this._executeAndCancelOnException(function() {
      // Execute the implementation-specific start process.
      this._executeStart();
      // Check if the operation is already completed.
      this._notifyPossibleCompletion();
    }, this);
  },

  /**
   * Cancel the operation. This may also be called before the job is started.
   * Implementations may also call this method to signal an error condition.
   *
   * @param aReason
   *        Result code indicating the cancel reason.
   */
  cancel: function(aReason) {
    // Check the validity of the parameter.
    if (aReason == Cr.NS_OK) {
      throw Components.Exception("Cancel called with a success code.",
       Cr.NS_ERROR_ILLEGAL_VALUE);
    }

    // Check if the operation was already canceled or completed. This is common
    // when a group of jobs gets canceled because one of them failed.
    if (this.isCompleted) {
      return;
    }

    // Execute the implementation-specific canceling process.
    this._executeCancel(aReason);

    // If canceling succeeded, report the provided result code.
    this.result = aReason;
    this._notifyCompletion();
  },

  /**
   * Called when the operation is started. Implementations must throw
   * exceptions if starting the operation is not possible. If the function
   * succeeds, implementations must call _notifyPossibleCompletion() when the
   * operation is finished, unless _checkIfCompleted() already returns true.
   */
  _executeStart: function() {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  /**
   * Called when the operation is canceled. Implementations may throw exceptions
   * if canceling is not possible.
   *
   * @param aReason
   *        Result code indicating the cancel reason.
   */
  _executeCancel: function(aReason) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  /**
   * Returns true if the operation is completed before _notifyCompletion() has
   * been called.
   */
  _checkIfCompleted: function() {
    return false;
  },

  /**
   * The event listener specified on construction. Subclasses may send custom
   * events to this listener.
   */
  _eventListener: null,

  /**
   * This function must be called by implementations to indicate that the
   * operation might be completed. It is not necessary to call this method if
   * the operation has been canceled.
   */
  _notifyPossibleCompletion: function() {
    // Use the implementation-specific state check.
    if (this._checkIfCompleted()) {
      this._notifyCompletion();
    }
  },

  /**
   * This function may be called by implementations to indicate that the
   * operation is completed. It is not necessary to call this method if the
   * operation has been canceled.
   */
  _notifyCompletion: function() {
    // Update the job state, and notify our listener that the operation is
    // completed. A completion notification is never sent more than once.
    if (!this.isCompleted) {
      this.isCompleted = true;
      // Avoid recursion by scheduling an event.
      this._mainThread.dispatch(function() {
        try {
          this._eventListener.onJobComplete(this, this.result);
        } catch(e) {
          Cu.reportError(e);
        }
      }.bind(this), Ci.nsIThread.DISPATCH_NORMAL);
    }
  },

  /**
   * Implementations must call this function after a callback from a worker
   * object is called, if the callback indicates that the worker has finished.
   *
   * The handler function cannot return a value to the worker object. If the job
   * has been canceled meanwhile, the handler function is not called.
   */
  _handleAsyncCallback: function(handlerFunction, thisObject) {
    // If the operation was not already canceled or completed
    if (!this.isCompleted) {
      // Execute the callback handler. If the handler raises an exception,
      // report it and cancel the operation.
      this._executeAndCancelOnCaughtException(handlerFunction, thisObject);
    }
  },

  /**
   * This function may be called by implementations to notify about progress of
   * the current operation. The progress properties of the job are updated
   * consequently.
   */
  _notifyJobProgressChange: function(aWebProgress, aRequest, aCurSelfProgress,
   aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
    // Update the job properties.
    this.curJobProgress = aCurTotalProgress;
    this.maxJobProgress = aMaxTotalProgress;
    // Simply propagate the event to our listener.
    this._eventListener.onJobProgressChange(this, aWebProgress, aRequest,
     aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress,
     aMaxTotalProgress);
  },

  /**
   * Execute the provided function. If the function raises an exception, report
   * it and cancel the operation.
   */
  _executeAndCancelOnCaughtException: function(innerFunction, thisObject) {
    try {
      innerFunction.apply(thisObject);
    } catch(e) {
      // Report the error before attempting the cancel operation.
      Cu.reportError(e);
      // Cancel while preserving the result code of XPCOM exceptions.
      if (e instanceof Ci.nsIXPCException && e.result != Cr.NS_OK) {
        this.cancel(e.result);
      } else {
        this.cancel(Cr.NS_ERROR_FAILURE);
      }
    }
  },

  /**
   * Execute the provided function. If the function raises an exception, cancel
   * the operation and report it.
   */
  _executeAndCancelOnException: function(innerFunction, thisObject) {
    try {
      innerFunction.apply(thisObject);
    } catch(e) {
      // Cancel while preserving the result code of XPCOM exceptions.
      if (e instanceof Ci.nsIXPCException && e.result != Cr.NS_OK) {
        this.cancel(e.result);
      } else {
        this.cancel(Cr.NS_ERROR_FAILURE);
      }
      // Report the exception.
      Cu.reportError(e);
    }
  },

  _mainThread: Cc["@mozilla.org/thread-manager;1"].
   getService(Ci.nsIThreadManager).mainThread,
}
