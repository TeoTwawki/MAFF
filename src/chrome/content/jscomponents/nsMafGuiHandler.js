/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.6.3
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2005 Christopher Ottley.
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

  showAbout: function() {
    var url = "chrome://maf/content/mafAboutDLG.xul";
    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes";
    this.window.openDialog(url, "_blank", win_prefs);
  },

  loadArchive: function(Maf) {
    try {
      var archiveToOpen = this.selectFileOpen();

      Maf.openFromArchive(MafPreferences.programFromOpenIndex(archiveToOpen[0]), archiveToOpen[1]);
    } catch(e) {
      mafdebug(e);
    }
  },

  /**
   * Opens a File choose dialog with a open mode.
   * @return The file selected.
   */
  selectFileOpen: function(defaultFilename) {
    var filters = this.getOpenFilters();

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                  .getService(Components.interfaces.nsIPrefService)
                  .getBranch("extensions.maf.");
    try {
      // Check pref for index and set it
      var defaultFilterIndex = prefs.getIntPref("current.open.filterindex");
    } catch(e) { }

    var result = this.selectFile(MafStrBundle.GetStringFromName("openmafarchivewindowtitle"),
                                  Components.interfaces.nsIFilePicker.modeOpen,
                                  filters,
                                  null,
                                  defaultFilterIndex,
                                  defaultFilename);

    prefs.setIntPref("current.open.filterindex", result[1]);

    return [result[1], result[0].path];
  },

  getOpenFilters: function() {

    var filterresult = new Array();
    var prefsOpenFilterLength = MafPreferences.getOpenFiltersLength();

    for (var i=0; i<prefsOpenFilterLength; i++) {

      var count = {};
      var result = {};
      MafPreferences.getOpenFilterAt(i, count, result);

      if (count.value == 3) {
        var entry = [result.value[0], result.value[1], parseInt(result.value[2])];

        filterresult[filterresult.length] = entry;
      }
    }
    return filterresult;
  },


  /**
   * Remove any non-ascii chars from result string
   */
  removeDoubleByteChars: function(strWithDoubleByteChars) {
    var result = "";

    if (strWithDoubleByteChars) {
      for (var i=0; i<strWithDoubleByteChars.length; i++) {
        if (strWithDoubleByteChars.charCodeAt(i) < 256) {
          result += strWithDoubleByteChars[i];
        }
      }
    }

    return result;
  },

  addAllTabsToArchive: function(Maf) {

    var title = this.removeDoubleByteChars(this.window.getBrowser().selectedBrowser.contentDocument.title);

    if (title != this.window.getBrowser().selectedBrowser.contentDocument.title) {
      title = title.replace(/\||:|-|,|\.|_/g, " ");
    }

    var defaultFileName = MafUtils.validateFileName(title).replace(/^\s+|\s+$/g, "");

    var archiveToAddTo = this.selectFileSave(defaultFileName);

    if ((typeof(archiveToAddTo) != "undefined") && (archiveToAddTo.length > 1)) {
    
      var browArray = Components.classes["@mozilla.org/array;1"]
                        .createInstance(Components.interfaces.nsIMutableArray);
                        
      for (var i=0; i<this.window.getBrowser().browsers.length; i++) {
        browArray.appendElement(this.window.getBrowser().browsers[i], false);
      }
                    
      Maf.saveAllTabsComplete(browArray, "", Prefs.tempFolder,
                              MafPreferences.programFromSaveIndex(archiveToAddTo[0]), archiveToAddTo[1]);
    }
  },

  addToArchive: function(Maf) {

    var title = this.removeDoubleByteChars(this.window.getBrowser().selectedBrowser.contentDocument.title);

    if (title != this.window.getBrowser().selectedBrowser.contentDocument.title) {
      title = title.replace(/\||:|-|,|\.|_/g, " ");
    }

    var defaultFileName = MafUtils.validateFileName(title).replace(/^\s+|\s+$/g, "");

    var archiveToAddTo = this.selectFileSave(defaultFileName);

    if ((typeof(archiveToAddTo) != "undefined") && (archiveToAddTo.length > 1)) {
      Maf.saveAsWebPageComplete(this.window.getBrowser().selectedBrowser, Prefs.tempFolder,
                                MafPreferences.programFromSaveIndex(archiveToAddTo[0]), archiveToAddTo[1]);
    }
  },

  /**
   * Opens a File choose dialog with a save mode.
   * @return The file selected.
   */
  selectFileSave: function(defaultFilename) {
    var filters = this.getSaveFilters();

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefService)
                   .getBranch("extensions.maf.");
    try {
      // Check pref for index and set it
      var defaultFilterIndex = prefs.getIntPref("current.save.filterindex");
    } catch(e) { }

    var result = this.selectFile(MafStrBundle.GetStringFromName("savemafarchivewindowtitle"),
                                  Components.interfaces.nsIFilePicker.modeSave,
                                  filters,
                                  null,
                                  defaultFilterIndex,
                                  defaultFilename);

    if (result[0] != null) {
      prefs.setIntPref("current.save.filterindex", result[1]);
    }

    var selectedFileType = filters[result[1]][1];

    selectedFileType = selectedFileType.substring(1,selectedFileType.length);

    try {
      var filename = result[0].path;
      // if the file name does not end with the file type specified, tack it on

      if (filename.substring(filename.length-selectedFileType.length, filename.length).toLowerCase() !=
          selectedFileType.toLowerCase()) {
          filename += selectedFileType;
      }
    } catch(e) {
      return;
    }

    return [result[1], filename];
  },

  selectFileSaveArchive: function(defaultFilename) {
    var result = this.selectFileSave(defaultFilename);
    if (result != null) {
      return result.toString();
    } else {
      return "";
    }
  },

  getSaveFilters: function() {
    var filterresult = new Array();
    var prefsSaveFilterLength = MafPreferences.getSaveFiltersLength();

    for (var i=0; i<prefsSaveFilterLength; i++) {

      var count = {};
      var result = {};
      MafPreferences.getSaveFilterAt(i, count, result);

      if (count.value == 3) {
        // If it's on Windows, show the filter string as part of the file type.
        if (this.window.navigator.userAgent.indexOf("Windows") != -1) {
          var entry = [result.value[0] + " (" + result.value[1] + ")", result.value[1], parseInt(result.value[2])];
        } else {
          var entry = [result.value[0], result.value[1], parseInt(result.value[2])];
        }

        filterresult[filterresult.length] = entry;
      }
    }

    return filterresult;
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
   * Shows the filepicker dialog with the directory select mode.
   * @return The directory selected as a string.
   */
  selectDirectory: function(windowTitle, initialDirectory) {
    var result = initialDirectory;

    var fp = Components.classes["@mozilla.org/filepicker;1"]
                .createInstance(Components.interfaces.nsIFilePicker);
    fp.init(this.window, windowTitle, Components.interfaces.nsIFilePicker.modeGetFolder);

    try {
      if (initialDirectory != null) {
        // Create a directory reference to use
        var dir = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsILocalFile);
        dir.initWithPath(initialDirectory);
        fp.displayDirectory = dir;
      }
    } catch(e) {

    }

    var res = fp.show();

    if (res == Components.interfaces.nsIFilePicker.returnOK) {
      var selDir = fp.file.QueryInterface(Components.interfaces.nsILocalFile);
      result = selDir.path;
    }

    return result;
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

    var res = fp.show();
    if (res == Components.interfaces.nsIFilePicker.returnOK ||
        res == Components.interfaces.nsIFilePicker.returnReplace) {
      return [fp.file, fp.filterIndex];
    } else { // Cancelled
      return [null, 0];
    }
  },


  /**
   * Shows the file picker dialog allowing the user to select ONLY a specific file.
   * @return The full file path and filename as a string
   */
  selectSpecificFile: function(windowTitle, initialFilePath, filterFilename) {
    var result = initialFilePath;

    var defaultPath = null;

    try {
      // Create a directory reference to use
      var filedir = Components.classes["@mozilla.org/file/local;1"]
                      .createInstance(Components.interfaces.nsILocalFile);
      filedir.initWithPath(initialFilePath);

      defaultPath = filedir.path;

      var leafname = filedir.leafName;

      defaultFilename = leafname;

      // Remove the file part to get the directory
      defaultPath = defaultPath.substring(0, defaultPath.length - leafname.length);
    } catch(e) {
      mafdebug(e);
    }

    try {
      var filter = [ [filterFilename, filterFilename] ];
      var fresult = this.selectFile(windowTitle,
                                     Components.interfaces.nsIFilePicker.modeOpen,
                                     filter,
                                     defaultPath,
                                     defaultFilename);
      result = fresult[0].path;
    } catch(e) {

    }
    return result;
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