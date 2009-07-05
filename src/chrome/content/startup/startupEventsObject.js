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

/**
 * This object handles extension startup and shutdown, and acts as bookkeeper
 *  for the related observer registrations. Actual work is delegated to the
 *  StartupInitializer object.
 */
var StartupEvents = {

  /**
   * This function must be called once on application startup, and simply
   *  registers with the host application for other notifications, to be
   *  handled by the "observe" function.
   */
  onAppStartup: function() {
    this._observerService.addObserver(this, "profile-after-change", false);
    this._observerService.addObserver(this, "xpcom-shutdown", false);
  },

  /** Called when it is time to unregister all the observers. */
  onAppShutdown: function() {
    this._observerService.removeObserver(this, "profile-after-change");
    this._observerService.removeObserver(this, "xpcom-shutdown");
  },

  /** Called when a user profile has fully loaded. */
  afterProfileChange: function() {
    // Initialize the extension behavior
    StartupInitializer.initFromCurrentProfile();
    // Display the welcome window if required
    if (Prefs.otherDisplayWelcome) {
      Welcome.welcomeDialog();
      Prefs.otherDisplayWelcome = false;
    }
  },

  // --- nsIObserver interface functions ---

  /**
   * This function handles all the notifications related to application startup
   *  and shutdown. The aTopic argument is used to distinguish between
   *  notifications.
   */
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "profile-after-change") { this.afterProfileChange(); }
    if (aTopic == "xpcom-shutdown")       { this.onAppShutdown();      }
  },

  // --- Private methods and properties ---

  _observerService: Cc["@mozilla.org/observer-service;1"]
   .getService(Ci.nsIObserverService)
};