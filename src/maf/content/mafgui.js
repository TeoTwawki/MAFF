/**
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

/**
 * Holds GUI related logic.
 */
var MafGUI = {

  /**
   * Prompts the user for the archive to load and then loads it.
   */
  loadArchive: function() {
    var archiveToOpen = this.selectFileOpen();

    Maf.openFromArchive(MafPreferences.temp,
                        MafPreferences.programFromOpenIndex(archiveToOpen[0]), archiveToOpen[1]);
  },

  /**
   * Prompts the user for the archive to save to and then adds the page to it.
   */
  addToArchive: function() {
    var archiveToAddTo = this.selectFileSave();

    Maf.saveAsWebPageComplete(window.getBrowser().selectedBrowser, MafPreferences.temp,
                              MafPreferences.programFromSaveIndex(archiveToAddTo[0]), archiveToAddTo[1]);
  },

  /**
   * Prompts the user for the archive to save to and then adds all tabbed pages to it.
   */
  addAllTabsToArchive: function() {
    var archiveToAddTo = this.selectFileSave();

    Maf.saveAllTabsComplete(window.getBrowser().browsers, MafPreferences.temp,
                            MafPreferences.programFromSaveIndex(archiveToAddTo[0]), archiveToAddTo[1]);
  },

  /**
   * Shows the Preferences
   */
  showPreferences: function() {
    MafUtils.showPreferencesDLG();
  },

  /**
   * Opens a File choose dialog with a save mode.
   * @return The file selected.
   */
  selectFileSave: function() {
    var filters = MafPreferences.getSaveFilters();

    var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("maf.");
    try {
      // Check pref for index and set it
      var defaultFilterIndex = prefs.getIntPref("savearchive.filterindex");
    } catch(e) { }

    var result = this.selectFile("Select MAF Archive:",
                                  filePickerIID.modeSave,
                                  filters,
                                  null,
                                  defaultFilterIndex);

    prefs.setIntPref("savearchive.filterindex", result[1]);

    var selectedFileType = filters[result[1]][1];

    selectedFileType = selectedFileType.substring(1,selectedFileType.length);

    var filename = result[0].path;
    // if the file name does not end with the file type specified, tack it on

    if (filename.substring(filename.length-selectedFileType.length, filename.length).toLowerCase() !=
        selectedFileType.toLowerCase()) {
        filename += selectedFileType;
    }

    return [result[1], filename];
  },

  /**
   * Opens a File choose dialog with a open mode.
   * @return The file selected.
   */
  selectFileOpen: function() {
    var filters = MafPreferences.getOpenFilters();

    var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("maf.");
    try {
      // Check pref for index and set it
      var defaultFilterIndex = prefs.getIntPref("openarchive.filterindex");
    } catch(e) { }

    var result = this.selectFile("Select MAF Archive:",
                                  filePickerIID.modeOpen,
                                  filters,
                                  null,
                                  defaultFilterIndex);

    prefs.setIntPref("openarchive.filterindex", result[1]);

    return [result[1], result[0].path];
  },

  /**
   * Shows the filepicker dialog with the appropriate filters.
   * @return The file selected.
   */
  selectFile: function(windowTitle, filePickerMode, filters, initialDirectory, defaultFilterIndex) {
    var fp = Components.classes[filePickerContractID].createInstance(filePickerIID);
    fp.init(window, windowTitle, filePickerMode);


    try {
      if (initialDirectory != null) {
        // Create a directory reference to use
        var dir = Components.classes[localFileContractID].getService(localFileIID);
        dir.initWithPath(initialDirectory);

        fp.displayDirectory = dir;
      }
    } catch(e) {
      alert(e);
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
    return [fp.file, fp.filterIndex];
  },


  /**
   * Shows the filepicker dialog with the directory select mode.
   * @return The directory selected as a string.
   */
  selectDirectory: function(windowTitle, initialDirectory) {
    var result = initialDirectory;

    var fp = Components.classes[filePickerContractID].createInstance(filePickerIID);
    fp.init(window, windowTitle, filePickerIID.modeGetFolder);

    try {
      if (initialDirectory != null) {
        // Create a directory reference to use
        var dir = Components.classes[localFileContractID].getService(localFileIID);
        dir.initWithPath(initialDirectory);

        fp.displayDirectory = dir;
      }
    } catch(e) {

    }

    var res = fp.show();

    if (res == filePickerIID.returnOK) {
      var selDir = fp.file.QueryInterface(localFileIID);
      result = selDir.path;
    }

    return result;
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
      var filedir = Components.classes[localFileContractID].getService(localFileIID);
      filedir.initWithPath(initialFilePath);

      defaultPath = filedir.path;

      var leafname = filedir.leafName;

      // Remove the file part to get the directory
      defaultPath = defaultPath.substring(0, defaultPath.length - leafname.length);
    } catch(e) {

    }

    try {
      var filter = [ [filterFilename, filterFilename] ];
      var fresult = this.selectFile(windowTitle,
                                     filePickerIID.modeOpen,
                                     filter,
                                     defaultPath);
      result = fresult[0].path;
    } catch(e) {

    }

    return result;
  },

  /**
   *  Browse the open archives that are available.
   */
  browseOpenArchives: function() {
    MafUtils.showBrowseOpenArchivesDLG();
  },

  /**
   * Show the about dialog
   */
  showAbout: function() {
    MafUtils.showAboutDLG();
  }

};
