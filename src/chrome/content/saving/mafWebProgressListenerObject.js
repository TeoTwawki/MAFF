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
 * Portions created by the Initial Developer are Copyright (C) 2008
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

// Import XPCOMUtils to generate the QueryInterface functions
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * This object implements nsIWebProgressListener2 by forwarding all calls to a
 *  wrapped object. In addition, the interesting state changes are notified to
 *  the specified MAF event listener.
 *
 * @param aMafEventListener   Object whose onDownloadComplete or
 *                             onDownloadFailed methods will be called.
 * @param wrappedObject       Wrapped object implementing
 *                             nsIWebProgressListener2.
 */
function MafWebProgressListener(aMafEventListener, wrappedObject) {
  this._mafEventListener = aMafEventListener;
  this._wrappedObject = wrappedObject;

  // This function creates a forwarding function for wrappedObject
  function makeForwardingFunction(functionName) {
    return function() {
      return wrappedObject[functionName].apply(wrappedObject, arguments);
    }
  }

  // Forward all the functions that are not explicitly overrided
  for (var propertyName in wrappedObject) {
    if (typeof wrappedObject[propertyName] == "function" &&
     !(propertyName in this)) {
      this[propertyName] = makeForwardingFunction(propertyName);
    }
  }
}

MafWebProgressListener.prototype = {

  // --- nsISupports interface functions ---

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener,
   Ci.nsIWebProgressListener2]),

  // --- nsIWebProgressListener interface functions ---

  /**
   * Notifies the associated event listener when an interesting change occurs.
   */
  onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
    // Trap exceptions to ensure the wrapped object gets called
    try {
      // Suppress all events if the download is thought to be completed
      if (!this._completed) {
        // If the save operation failed, notify our listener
        if (aStatus != Cr.NS_OK) {
          this._completed = true;
          this._mafEventListener.onDownloadFailed(aStatus);
        // If the entire save operation is completed, notify our listener
        } else if ((aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) &&
         (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK)) {
          this._completed = true;
          this._mafEventListener.onDownloadComplete();
        }
      }
    } catch(e) {
      Cu.reportError(e);
    }

    // Forward the call to the wrapped object
    this._wrappedObject.onStateChange(aWebProgress, aRequest, aStateFlags,
     aStatus);
  },

  // --- Private methods and properties ---

  _mafEventListener: null,
  _wrappedObject: null,
  _completed: false
}