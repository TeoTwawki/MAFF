/**
 * Mozilla Archive Format
 * ======================
 *
 *  Copyright (c) 2005 Christopher Ottley.
 *  Portions Copyright (c) 2008 Paolo Amadini.
 *
 *  This file is part of MAF.
 *
 *  MAF is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  MAF is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.

 *  You should have received a copy of the GNU General Public License
 *  along with MAF; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

// Provides MAF Gui Handler Object

/**
 * The MAF Gui Handler.
 */

function MAFGuiHandlerClass() {

};

MAFGuiHandlerClass.prototype = {

  init: function(window) {
    this.window = window;
  },

  addAllTabsToArchive: function(Maf) {
    // Use the global saveDocument function with the special MAF parameters
    saveDocument(this.window.getBrowser().selectedBrowser.contentDocument,
     {mafAskSaveArchive: true, mafSaveTabs: this.window.getBrowser().browsers});
  },

  showPreferences: function() {
    // Determine the expected behavior of preferences windows
    try {
      var instantApply =
       Components.classes["@mozilla.org/preferences-service;1"]
       .getService(Components.interfaces.nsIPrefService)
       .getBranch("").getBoolPref("browser.preferences.instantApply");
    } catch(e) {
      instantApply = false;
    }
    // Open the preferences window. If instant apply is on, the window will
    //  be minimizable (dialog=no), conversely if instant apply is not enabled
    //  the window will be modal and not minimizable.
    this.window.openDialog(
     "chrome://maf/content/preferences/prefsDialog.xul",
     "maf-prefsDialog",
     "chrome,titlebar,toolbar,centerscreen," +
     (instantApply ? "dialog=no" : "modal"));
  },

  /**
   * Shows the user a window that allows them to browse the open archives.
   */
  browseOpenArchives: function() {
    var url = "chrome://maf/content/mafBrowseOpenArchivesDLG.xul";

    var w = 500;
    var h = 500;

    var sX = (this.window.screen.width/2)-(Math.round(w/2));
    var sY = (this.window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    this.window.openDialog(url, "_blank", win_prefs, this.window);
  },

  addSelectedTabsToArchive: function(Maf) {
    var returnValues = {};
    this.window.openDialog(
     "chrome://maf/content/savefrontend/multiSaveDialog.xul",
     "maf-multiSaveDialog",
     "chrome,titlebar,centerscreen,modal,resizable=yes",
     this.window,
     returnValues);
    if (returnValues.selectedTabs) {
      // Use the global saveDocument function with the special MAF parameters
      this.window.saveDocument(
       this.window.getBrowser().selectedBrowser.contentDocument,
       {mafAskSaveArchive: true, mafSaveTabs: returnValues.selectedTabs});
    }
  },

  /**
   * Shows the dialog to the user when extracting files.
   */
  showOpenTabsDLG: function(objMafExpander) {
    var url = "chrome://maf/content/mafOpenTabsDLG.xul";

    var w = 400;
    var h = 50;

    var sX = (this.window.screen.width/2)-(Math.round(w/2));
    var sY = (this.window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    this.window.openDialog(url, "_blank", win_prefs, objMafExpander);
  }
};