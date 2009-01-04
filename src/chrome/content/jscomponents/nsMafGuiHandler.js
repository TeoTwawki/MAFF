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

  loadArchive: function(Maf) {
    try {
      var archiveToOpen = this.selectFileOpen();

      Maf.openFromArchive(archiveToOpen[0], archiveToOpen[1]);
    } catch(e) {
      mafdebug(e);
    }
  },

  /**
   * Opens a File choose dialog with a open mode.
   * @return The file selected.
   */
  selectFileOpen: function(defaultFilename) {
    var result = this.selectFile(MafStrBundle.GetStringFromName("openmafarchivewindowtitle"),
                                  Components.interfaces.nsIFilePicker.modeOpen,
                                  FileFilters.openFiltersArray,
                                  null,
                                  0,
                                  defaultFilename);

    return [FileFilters.scriptPathFromFilePath(result[0].path), result[0].path];
  },

  addAllTabsToArchive: function(Maf) {
    // Use the global saveDocument function with the special MAF parameters
    saveDocument(this.window.getBrowser().selectedBrowser.contentDocument,
     {mafAskSaveArchive: true, mafSaveTabs: this.window.getBrowser().browsers});
  },

  addToArchive: function(Maf) {
    // Use the global saveDocument function with the special MAF parameters
    saveDocument(this.window.getBrowser().selectedBrowser.contentDocument,
     {mafAskSaveArchive: true});
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
   * Shows the filepicker dialog with the appropriate filters.
   * @return The file selected.
   */
  selectFile: function(windowTitle, filePickerMode, filters, initialDirectory, defaultFilterIndex, defaultString) {
    var fp = Components.classes["@mozilla.org/filepicker;1"]
                .createInstance(Components.interfaces.nsIFilePicker);
    fp.init(this.window, windowTitle, filePickerMode);

    try {
      if (initialDirectory != null) {
        // Create a directory reference to use
        var dir = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsILocalFile);
        dir.initWithPath(initialDirectory);

        fp.displayDirectory = dir;
      }

      if (defaultString != null) {
        fp.defaultString = defaultString;
      }
    } catch(e) {
      mafdebug(e);
    }

    for (var i=0; i<filters.length; i++) {
      var title = filters[i][0];
      var mask = filters[i][1];
      fp.appendFilter(title, mask);
    }

    if (filters.length==0) {
      fp.appendFilters(nsIFilePicker.filterAll);
    }

    try {
      fp.filterIndex = defaultFilterIndex;
    } catch(e) { }

    fp.defaultExtension = " ";
    var res = fp.show();
    if (res == Components.interfaces.nsIFilePicker.returnOK ||
        res == Components.interfaces.nsIFilePicker.returnReplace) {
      return [fp.file, fp.filterIndex];
    } else { // Cancelled
      return [null, 0];
    }
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
    var url = "chrome://maf/content/mafSaveSelectedTabsDLG.xul";

    var w = 500;
    var h = 500;

    var sX = (this.window.screen.width/2)-(Math.round(w/2));
    var sY = (this.window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    this.window.openDialog(url, "_blank", win_prefs, this.window, Maf);
  },

  /**
   * Shows the dialog to the user when saving tabs.
   */
  showDownloadTabsDLG: function(objMafArchiver) {
    var url = "chrome://maf/content/mafSaveTabsDLG.xul";

    var w = 400;
    var h = 50;

    var sX = (this.window.screen.width/2)-(Math.round(w/2));
    var sY = (this.window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    this.window.openDialog(url, "_blank", win_prefs, objMafArchiver);
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