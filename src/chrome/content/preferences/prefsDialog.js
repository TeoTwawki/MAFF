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

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

/**
 * Handles the MAF preferences dialog.
 */
var PrefsDialog = {
  /**
   * Initializes the controls when the dialog is displayed.
   */
  onLoadDialog: function() {
    // Apply brand names to the dialog elements
    for (var [, elementName] in Iterator(["cbInterfaceMenuApp",
     "descVisitWebsite", "descShowWelcomePageAssociate"])) {
      Interface.applyBranding(document.getElementById(elementName));
    }
    // Check to see if the application menu is present
    document.getElementById("cbInterfaceMenuApp").hidden =
     !StartupInitializer.hasAppMenu;
    // If the application menu is present, assume that the status bar is missing
    if (StartupInitializer.hasAppMenu) {
      let (r = document.getElementById("radioInterfaceIconLocationStatus")) {
        r.setAttribute("label", r.getAttribute("labeladdonbar"));
        r.setAttribute("accesskey", r.getAttribute("accesskeyaddonbar"));
      }
    }
    // Determines if the welcome page handles file associations
    if (this._isOnWindows()) {
      document.getElementById("boxShowWelcomePage").hidden = true;
      document.getElementById("boxShowWelcomePageAssociate").hidden = false;
    }
    // Ensure that the preference values are updated from older versions
    document.getElementById("prefSaveComponent").value = Prefs.saveComponent;
    // Updates the status of the dialog controls
    this.onSaveComponentChange();
    this.onInterfaceMenuPageContextChange();
    // Ensure that there is enough space to display the elements that are now
    //  visible, and work around a behavior for which an additional one-pixel
    //  border is added when calculating the window's width.
    window.sizeToContent();
    window.innerWidth = document.documentElement.boxObject.width;
  },

  /* --- Interactive dialog functions and events --- */

  /**
   * Enables other dialog controls depending on the selected save component.
   */
  onSaveComponentChange: function() {
    var saveComponent = document.getElementById("prefSaveComponent").value;
    document.getElementById("cbSaveMhtmlCompatible").disabled = ["savecomplete",
     "completesave", "exactpersist"].indexOf(saveComponent) < 0;
  },

  /**
   * Enables other dialog controls depending on the page context menu option.
   */
  onInterfaceMenuPageContextChange: function() {
    document.getElementById("cbInterfaceMenuPageContextForTabs").disabled =
     !document.getElementById("prefInterfaceMenuPageContext").value;
  },

  /**
   * Displays the "Convert saved pages" window.
   */
  onActionConvertSavedPagesClick: function() {
    // If the convert window is already opened
    var convertDialog = Cc["@mozilla.org/appshell/window-mediator;1"].
     getService(Ci.nsIWindowMediator).getMostRecentWindow("Maf:Convert");
    if (convertDialog) {
      // Bring the window to the foreground
      convertDialog.focus();
    } else {
      // Open a new window to allow the conversion
      window.open(
       "chrome://maf/content/frontend/convertDialog.xul",
       "maf-convertDialog",
       "chrome,titlebar,centerscreen,resizable=yes");
    }
  },

  /**
   * Opens the welcome page in a new browser window. This must be done from code
   *  since labels with the "text-link" class cannot open chrome locations.
   */
  onActionShowWelcomePageClick: function() {
    // Use the helper function defined either in "utilityOverlay.js" or in
    //  "contentAreaUtils.js" depending on the host application.
    openNewWindowWith("chrome://maf/content/frontend/welcomePage.xhtml");
  },

  /* --- Dialog support functions --- */

  /**
   * Returns true if the application is executing on Windows.
   */
  _isOnWindows: function() {
    // For more information, see
    //  <https://developer.mozilla.org/en/nsIXULRuntime> and
    //  <https://developer.mozilla.org/en/OS_TARGET> (retrieved 2008-11-19).
    var xulRuntimeOs = Cc["@mozilla.org/xre/app-info;1"]
     .getService(Ci.nsIXULRuntime).OS;
    return (xulRuntimeOs == "WINNT");
  }
}