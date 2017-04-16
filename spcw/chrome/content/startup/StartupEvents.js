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
 * for the related observer registrations. Actual work is delegated to the
 * StartupInitializer object.
 */
var StartupEvents = {
  _notificationTopics: [
    "sessionstore-windows-restored",
    "quit-application",
    "xpcom-shutdown",
  ],

  // nsIObserver
  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "sessionstore-windows-restored": this.onWindowsRestored();  break;
      case "quit-application":              this.onAppQuit();          break;
      case "xpcom-shutdown":                this.onAppShutdown();      break;
    }
  },

  /**
   * Called when a user profile has fully loaded.
   */
  afterProfileChange: function() {
    for (let topic of this._notificationTopics) {
      Services.obs.addObserver(this, topic, false);
    }

    // Start the asynchronous operation that prepares the version information
    // that will be used when saving web archives.
    this._setAddonVersion();

    StartupInitializer.initFromCurrentProfile();
  },

  /**
   * Populates the StartupInitializer.addonVersion property with the version of
   * the installed extension asynchronously.
   */
  _setAddonVersion: function() {
    // Get the object with the version information of the add-on.
    var addonId = "{61ec261d-5aa2-47f6-b6e7-e65efdbaac93}";
    let { AddonManager } =
     Cu.import("resource://gre/modules/AddonManager.jsm", {});
    AddonManager.getAddonByID(addonId, function (aAddon) {
      StartupInitializer.addonVersion = aAddon.version;
    });
  },

  /**
   * Called when it is time to unregister all the observers.
   */
  onAppShutdown: function() {
    for (let topic of this._notificationTopics) {
      Services.obs.removeObserver(this, topic);
    }
  },

  /**
   * Called after all the browser windows have been shown.
   */
  onWindowsRestored: function() {
    let browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
    if (!browserWindow) {
      // Very rarely, it might happen that at this time all browser windows
      // have already been closed. In this case, we will attempt to show the
      // conversion dialog again on the next startup.
      return;
    }
    if (!Prefs.firstRun) {
      browserWindow.open("chrome://spcw/content/convert/convertDialog.xul",
                         "spcw-convertDialog",
                         "chrome,titlebar,centerscreen,resizable=yes");
      Prefs.firstRun = true;
    }
  },

  /**
   * Called when the application is shutting down.
   */
  onAppQuit: function() {
    StartupInitializer.terminate();
  },
};
