/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.4.1
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2004 Christopher Ottley.
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


const mafGuiHandlerContractID = "@mozilla.org/maf/guihandler;1";
const mafGuiHandlerCID = Components.ID("{4a5db9f8-35d0-4cc0-91b6-681cd698495a}");
const mafGuiHandlerIID = Components.interfaces.nsIMafGuiHandler;

var MafPreferences = null;

var MafUtils = null;

var MafStrBundle = null;

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

      Maf.openFromArchive(MafPreferences.temp,
                          MafPreferences.programFromOpenIndex(archiveToOpen[0]), archiveToOpen[1]);
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
                  .getService(Components.interfaces.nsIPrefService).getBranch("maf.");
    try {
      // Check pref for index and set it
      var defaultFilterIndex = prefs.getIntPref("openarchive.filterindex");
    } catch(e) { }

    var result = this.selectFile(MafStrBundle.GetStringFromName("openmafarchivewindowtitle"),
                                  Components.interfaces.nsIFilePicker.modeOpen,
                                  filters,
                                  null,
                                  defaultFilterIndex,
                                  defaultFilename);

    prefs.setIntPref("openarchive.filterindex", result[1]);

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


  addAllTabsToArchive: function(Maf) {
    var defaultFileName = MafUtils.validateFileName(this.window.getBrowser().selectedBrowser.contentDocument.title);

    var archiveToAddTo = this.selectFileSave(defaultFileName);

    if ((typeof(archiveToAddTo) != "undefined") && (archiveToAddTo.length > 1)) {
      Maf.saveAllTabsComplete(this.window.getBrowser().browsers, MafPreferences.temp,
                              MafPreferences.programFromSaveIndex(archiveToAddTo[0]), archiveToAddTo[1]);
    }
  },

  addToArchive: function(Maf) {
    var defaultFileName = MafUtils.validateFileName(this.window.getBrowser().selectedBrowser.contentDocument.title);

    var archiveToAddTo = this.selectFileSave(defaultFileName);

    if ((typeof(archiveToAddTo) != "undefined") && (archiveToAddTo.length > 1)) {
      Maf.saveAsWebPageComplete(this.window.getBrowser().selectedBrowser, MafPreferences.temp,
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
                   .getService(Components.interfaces.nsIPrefService).getBranch("maf.");
    try {
      // Check pref for index and set it
      var defaultFilterIndex = prefs.getIntPref("savearchive.filterindex");
    } catch(e) { }

    var result = this.selectFile(MafStrBundle.GetStringFromName("savemafarchivewindowtitle"),
                                  Components.interfaces.nsIFilePicker.modeSave,
                                  filters,
                                  null,
                                  defaultFilterIndex,
                                  defaultFilename);

    prefs.setIntPref("savearchive.filterindex", result[1]);

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

  getSaveFilters: function() {
    var filterresult = new Array();
    var prefsSaveFilterLength = MafPreferences.getSaveFiltersLength();

    for (var i=0; i<prefsSaveFilterLength; i++) {

      var count = {};
      var result = {};
      MafPreferences.getSaveFilterAt(i, count, result);

      if (count.value == 3) {
        var entry = [result.value[0], result.value[1], parseInt(result.value[2])];

        filterresult[filterresult.length] = entry;
      }
    }

    return filterresult;
  },

  showPreferences: function() {
    var url = "chrome://maf/content/mafPreferencesDLG.xul";

    var w = 500;
    var h = 500;

    var sX = (this.window.screen.width/2)-(Math.round(w/2));
    var sY = (this.window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                     ",width="+ w +",height=" + h;
    this.window.openDialog(url, "_blank", win_prefs);
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

    var res=fp.show();
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
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafGuiHandlerIID) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};


function mafdebug(text) {
  var csClass = Components.classes['@mozilla.org/consoleservice;1'];
  var cs = csClass.getService(Components.interfaces.nsIConsoleService);
  cs.logStringMessage(text);
};

String.prototype.trim = function() {
  // skip leading and trailing whitespace
  // and return everything in between
  var x = this;
  x = x.replace(/^\s*(.*)/, "$1");
  x = x.replace(/(.*?)\s*$/, "$1");
  return x;
};

/**
 * Replace all needles with newneedles
 */
String.prototype.replaceAll = function(needle, newneedle) {
  var x = this;
  x = x.split(needle).join(newneedle);
  return x;
};

var MAFGuiHandlerFactory = new Object();

MAFGuiHandlerFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafGuiHandlerIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafPreferences == null) {
    MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                          .getService(Components.interfaces.nsIMafPreferences);
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }
  
  return (new MAFGuiHandlerClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFGuiHandlerModule = new Object();

MAFGuiHandlerModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafGuiHandlerCID,
                                  "Maf Gui Handler JS Component",
                                  mafGuiHandlerContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFGuiHandlerModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafGuiHandlerCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFGuiHandlerFactory;
};

MAFGuiHandlerModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFGuiHandlerModule;
};

