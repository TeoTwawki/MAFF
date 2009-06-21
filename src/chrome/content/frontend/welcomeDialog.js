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
 * Handles the MAF welcome dialog.
 */
var WelcomeDialog = {

  /**
   * True if the dialog accept button has been pressed.
   */
  dialogConfirmed: false,

  // --- Interactive dialog functions and events ---

  /**
   * Initializes the dialog.
   */
  onLoadDialog: function() {
    // File associations are supported on Windows only
    document.getElementById("brShowOnlyOnWindows").setAttribute("hidden",
     this._isOnWindows() ? "false" : "true");
    // Adjust the height of the window appropriately
    window.sizeToContent();
    // After the window's initial height has been set, allow a scrollbar to
    //  appear in the main content box, if required. This allows the user to see
    //  the box contents even if the window is resized, which is possible on
    //  some platforms, or if the window height was limited because it exceeded
    //  the height of the desktop.
    document.getElementById("innerbox").setAttribute("style",
     "overflow: auto;");
  },

  /**
   * The first time the accept button is pressed, applies the selected options.
   *  The second time, if the operation succeeded, dismisses the dialog.
   */
  onDialogAccept: function() {
    // If the options have not been applied yet
    if (!this.dialogConfirmed) {
      // Apply the requested changes
      this._applyOptions();
      // The changes have been successfully applied
      this.dialogConfirmed = true;
      // Change the label of the accept button
      var thisDialog = document.getElementById("welcomeDialog");
      thisDialog.getButton("accept").label =
       thisDialog.getAttribute("buttonlabelacceptok");
      // Display the changes confirmation page
      document.getElementById("deckOptions").selectedIndex = 1;
      // Do not dismiss the dialog now
      return false;
    }

    // Dismiss the dialog
    return true;
  },

  // --- Dialog support functions ---

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
  },

  /**
   * Apply the changes requested by the selected options.
   */
  _applyOptions: function() {
    // Apply the file association option on Windows
    var associate = document.getElementById("cbAssociate").checked;
    if (this._isOnWindows() && associate) {
      try {
        FileAssociations.createAssociationsForMAFF();
        FileAssociations.createAssociationsForMHTML();
      } catch(e) {
        // Operation failed
        this._prompts.alert(null, document.title,
         this._formattedStr("associate.failed.msg", [e.message]));
        throw e;
      }
    }

    // Apply the Save Complete option as requested
    var saveComplete = document.getElementById("cbSaveComplete").checked;
    Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).
     getBranch("extensions.maf.").setCharPref("save.component", saveComplete ?
     Prefs.SAVECOMPONENT_SAVECOMPLETE : Prefs.SAVECOMPONENT_STANDARD)

    // Preselect the requested save filter
    var saveMaff = document.getElementById("cbSaveMaff").checked;
    DynamicPrefs.saveFilterIndex = (saveMaff ? 0 : 1);
    Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).
     getBranch("browser.download.").setIntPref("save_converter_index",
     (saveMaff ? 2 : 3))

    // Preselect the "All Files" open filter
    DynamicPrefs.openFilterIndex = 4 + FileFilters.openFilters.length;
  },

  /**
   * Return the string whose key is specified from the dialog's stringbundle.
   */
  _str: function(aKey) {
    return document.getElementById("bundleDialog").getString(aKey);
  },

  /**
   * Return the string whose key is specified from the dialog's stringbundle,
   *  populating it with the arguments in the given array.
   */
  _formattedStr: function(aKey, aArgs) {
    return document.getElementById("bundleDialog").getFormattedString(aKey,
     aArgs);
  },

  _prompts: Cc["@mozilla.org/embedcomp/prompt-service;1"]
   .getService(Ci.nsIPromptService)
}