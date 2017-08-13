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

XPCOMUtils.defineLazyModuleGetter(this, "UpdateUtils",
                                  "resource://gre/modules/UpdateUtils.jsm");

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
    try {
      if (!Prefs.otherRestartingAsWorkaround) {
        // Multi-process should have been disabled automatically on Release, but
        // because of bug 1374653 it may remain enabled after installation until
        // the browser is restarted again. In this case, we apply a workaround.
        let isReleaseBrowser = /^(release|default)($|\-)/.test(
         UpdateUtils.UpdateChannel);
        if (isReleaseBrowser && Services.appinfo.browserTabsRemoteAutostart) {
          // Only attempt this workaround once. If it fails, or if the user has
          // just enabled multi-process manually from internal preferences, the
          // multi-process welcome dialog will show relevant instructions.
          Prefs.otherRestartingAsWorkaround = true;
          Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup)
           .quit(Ci.nsIAppStartup.eForceQuit | Ci.nsIAppStartup.eRestart);
          return;
        }
      } else if (!Services.appinfo.browserTabsRemoteAutostart) {
        // The workaround was effective, reset the preference so we can use the
        // workaround again if the add-on is uninstalled and reinstalled.
        Prefs.otherRestartingAsWorkaround = false;
      }
    } catch (e) {
      // Just continue with normal initialization in case any error occurs.
    }

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
    // Get the object with the version information of Mozilla Archive Format.
    var addonId = "{7f57cf46-4467-4c2d-adfa-0cba7c507e54}";
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
    if (Prefs.otherDisplayWelcomePage) {
      // This is either the first installation or an update from a very old
      // version that didn't reset the preference above. On Windows, we should
      // create the file associations for MAFF archives now, unless the user
      // disabled the option in the old version. The associations for MHTML
      // archives can be added later from the preferences dialog.
      if (this._isOnWindows() && Prefs.associateMaff) {
        try {
          FileAssociations.createAssociationsForMAFF();
        } catch (e) {
          Cu.reportError(e);
        }
      }
      // Preselect the "All Files" open filter.
      DynamicPrefs.openFilterIndex = 4 + FileFilters.openFilters.length;
      Prefs.otherDisplayWelcomePage = false;
      Prefs.otherDisplayConvertPage = false;
    } else if (Prefs.otherDisplayConvertPage) {
      // If this is an update, likely the user has already saved web pages using
      // the MAFF or MHTML formats, and we should display a welcome page with
      // information on compatibility if we haven't displayed it before.
      let browserWindow = Services.wm.getMostRecentWindow("navigator:browser");
      if (browserWindow) {
        browserWindow.getBrowser().loadTabs(
         ["chrome://maf/content/integration/convertPage.xhtml"],
         false, false);
        Prefs.otherDisplayConvertPage = false;
      }
    }
  },

  /**
   * Called when the application is shutting down.
   */
  onAppQuit: function() {
    StartupInitializer.terminate();
  },

  /**
   * Returns true if the application is executing on Windows.
   */
  _isOnWindows: function() {
    return Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS ==
     "WINNT";
  },
};
