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
 * The MAF preferences.
 */
var MafPreferences = {

  /** The temp folder. */
  temp: "",

  /** The registered scripts used with archiving. */
  programExtensions: new Array(),

  /** The extension that handles *.maf by default. */
  defaultMAFExtensionIndex: 0,

  archiveOpenMode: 1,
     /** 0 - Do nothing. */
     /** 1 - Open all in new tabs. */
     /** 2 - Dialog box showing all archived files, select to open. */

  OPENMODE_NOTHING: 0,

  OPENMODE_ALLTABS: 1,

  OPENMODE_SHOWDIALOG: 2,

  /** URL Rewrite enabled. */
  urlRewrite: true,

  /** Save extended metadata. */
  saveExtendedMetadata: false,

  /** Windows specific preferences. */
  win_invisible: false,

  win_wscriptexe: "",

  win_invisiblevbs: "",

  isLoaded: false,

  /**
   * Creates a multi-dimensional array holding info on each registered program
   */
  getOpenFilters: function() {
    var result = [ ["MAF Archives", "*.maf", this.defaultMAFExtensionIndex] ];
    for (var i=0; i<this.programExtensions.length; i++) {
      var entry = ["MAF " + this.programExtensions[i][0] + " Archives"];

      // Construct a string like "*.zip.maf; *.maf.zip"
      var additionalExts = "";
      for (var j=0; j<this.programExtensions[i][3].length; j++) {
        if (additionalExts == "") {
          additionalExts = this.programExtensions[i][3][j];
        } else {
          additionalExts += "; " + this.programExtensions[i][3][j];
        }
      }
      entry[entry.length] = additionalExts;
      // Add associated program extension index
      entry[entry.length] = i;
      result[result.length] = entry;
    }
    return result;
  },

  /**
   * Creates a regular expression that matches registered MAF application extensions
   */
  getOpenFilterRegEx: function() {
    var regExStr = "^.+\\.maf$"; // Matches *.maf

    for (var i=0; i<this.programExtensions.length; i++) {
      for (var j=0; j<this.programExtensions[i][3].length; j++) {
        var progRegEx = this.programExtensions[i][3][j];
        progRegEx = progRegEx.replaceAll(".", "\\.").replaceAll("*", ".+");
        regExStr += "|^" + progRegEx + "$";
      }
    }

    return new RegExp(regExStr, "i");
  },

  /**
   * Creates a multi-dimensional array holding info on each registered program
   */
  getSaveFilters: function() {
    var result = [ ["MAF Archives", "*.maf", this.defaultMAFExtensionIndex] ];

    // Each unique extension has its own entry
    for (var i=0; i<this.programExtensions.length; i++) {
      for (var j=0; j<this.programExtensions[i][3].length; j++) {
        var entry = ["MAF " + this.programExtensions[i][0] + " Archives", this.programExtensions[i][3][j], i];
        result[result.length] = entry;
      }
    }
    return result;
  },

  /**
   * Gets the program to use from the selected index.
   */
  programFromSaveIndex: function(index) {
    var filters = this.getSaveFilters();
    var selProgExt = this.programExtensions[filters[index][2]];
    return selProgExt[1];
  },

  /**
   * Gets the program to use from the selected index.
   */
  programFromOpenIndex: function(index) {
    var filters = this.getOpenFilters();
    var selProgExt = this.programExtensions[filters[index][2]];
    return selProgExt[2];
  },

  /**
   * Looks for a match in the filters based on the filename
   * @return -1 if no open filter was found, index of the filter otherwise
   */
  getOpenFilterIndexFromFilename: function(filename) {
    var result = -1;
    var lcFilename = filename.toLowerCase();

    // Do a simple string comparison search
    // TODO: Maybe, make this a bit more robust using regular expressions
    //       Convert the open filter string into a regex dynamically and check
    //       for a match on the filename.
    var filters = this.getOpenFilters();

    for (var i=0; i<filters.length; i++) {
      var mask = filters[i][1].toLowerCase();
      if (mask.indexOf(";") > 0) {
        // We have a complex mask
        var submasks = mask.split(";");

        for (var j=0; j<submasks.length; j++) {
          var currSubMask = submasks[j].trim();
          var suffix = currSubMask.substring(1, currSubMask.length);
          if (suffix == lcFilename.substring(lcFilename.length - suffix.length, lcFilename.length)) {
            result = i;
            break;
          }
        }

        if (result != -1) { break; }

      } else {
        // Simple mask
        // Assume that first character is a *
        var suffix = mask.substring(1, mask.length);
        if (suffix == lcFilename.substring(lcFilename.length - suffix.length, lcFilename.length)) {
          result = i;
          break;
        }
      }
    }

    return result;
  },

  /**
   * Load the preferences from the user prefs.
   */
  load: function() {
    if (!this.isLoaded) {
      var mafParentDir = this._getProfileDir();
      // Default if there's no stored prefs

      this.defaultMAFExtensionIndex = 0;

      // If not on windows
      if (navigator.userAgent.indexOf("Windows") == -1) {
        this.temp = mafParentDir + "/maf/maftemp/";
        this.programExtensions[this.programExtensions.length] = [
           "Zip", mafParentDir + "/maf/mafzip.sh", mafParentDir + "/maf/mafunzip.sh", ["*.zip.maf", "*.maf.zip"]];
      } else {
        this.temp = mafParentDir + "\\maf\\maftemp\\";
        this.programExtensions[this.programExtensions.length] = [
           "Zip", mafParentDir + "\\maf\\mafzip.bat", mafParentDir + "\\maf\\mafunzip.bat", ["*.zip.maf", "*.maf.zip"]];
        this.win_wscriptexe = "c:\\winnt\\system32\\wscript.exe",
        this.win_invisiblevbs = mafParentDir + "\\maf\\invis.vbs"
      };

    // Load the temp path
    // Load the defaultMAFExtensionIndex
    // Load the program extensions array
      // For each extension
        // Load the extension's id
        // Load the archive program path + filename
        // Load the extract program path + filename
        // Load each of the extensions wildcard file matches
      // end-for

      try {

        var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("maf.");

        this.temp = prefs.getCharPref("temp");
        this.urlRewrite = prefs.getBoolPref("urlrewrite");
        this.saveExtendedMetadata = prefs.getBoolPref("saveextendedmetadata");
        this.defaultMAFExtensionIndex = prefs.getIntPref("defaultmafhandler");
        this.archiveOpenMode = prefs.getIntPref("archiveopenmode");

        this.win_invisible = prefs.getBoolPref("wininvisible");
        this.win_wscriptexe = prefs.getCharPref("winwscriptexe");
        this.win_invisiblevbs = prefs.getCharPref("wininvisiblevbs");

        var noOfExtensions = prefs.getIntPref("noofextensions");

        this.programExtensions = new Array();

        for (var i=0; i<noOfExtensions; i++) {
          currEntry = new Array();
          currEntry[0] = prefs.getCharPref("ext." + i + ".id");
          currEntry[1] = prefs.getCharPref("ext." + i + ".archive");
          currEntry[2] = prefs.getCharPref("ext." + i + ".extract");
          var noOfMasks = prefs.getIntPref("ext." + i + ".masklength");
          maskEntry = new Array();
          for (var j=0; j<noOfMasks; j++) {
            maskEntry[j] = prefs.getCharPref("ext." + i + ".mask." + j);
          }
          currEntry[3] = maskEntry;
          this.programExtensions[this.programExtensions.length] = currEntry;
        }

      } catch(e) {
      // alert(e);
      }

    // Add MHT as the last archive format supported
      this.programExtensions[this.programExtensions.length] = [
         "MHT", MafMHTHander.MHT_ARCHIVE_PROG_ID, MafMHTHander.MHT_EXTRACT_PROG_ID, ["*.mht"]];
      this.isLoaded = true;
    }
  },

  /**
   * Save the preferences to the user prefs.
   */
  save: function() {
    // Save the temp path
    // Save the defaultMAFExtensionIndex
    // Save the program extensions array
      // For each extension
        // Save the extension's 3 letter id
        // Save the archive program path + filename
        // Save the extract program path + filename
        // Save each of the extensions wildcard file matches
      // end-for
    try {

      var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("maf.");

      prefs.setCharPref("temp", this.temp);
      prefs.setBoolPref("urlrewrite", this.urlRewrite);
      prefs.setBoolPref("saveextendedmetadata", this.saveExtendedMetadata);
      prefs.setIntPref("defaultmafhandler", this.defaultMAFExtensionIndex);
      prefs.setIntPref("archiveopenmode", this.archiveOpenMode);

      prefs.setBoolPref("wininvisible", this.win_invisible);
      prefs.setCharPref("winwscriptexe", this.win_wscriptexe);
      prefs.setCharPref("wininvisiblevbs", this.win_invisiblevbs);

      // Subtract 1 because MHT hander not counted
      prefs.setIntPref("noofextensions", this.programExtensions.length-1);
      for (var i=0; i<this.programExtensions.length; i++) {
        if (this.programExtensions[i][0] != "MHT") {
          prefs.setCharPref("ext." + i + ".id", this.programExtensions[i][0]);
          prefs.setCharPref("ext." + i + ".archive", this.programExtensions[i][1]);
          prefs.setCharPref("ext." + i + ".extract", this.programExtensions[i][2]);
          prefs.setIntPref("ext." + i + ".masklength", this.programExtensions[i][3].length);
          for (var j=0; j<this.programExtensions[i][3].length; j++) {
            prefs.setCharPref("ext." + i + ".mask." + j, this.programExtensions[i][3][j]);
          }
        }
      }

    } catch(e) {
      alert(e);
    }
  },

  _getProfileDir: function() {
    const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
    try {
      var result = (new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path;
    } catch (e) {
      result = "";
      debug(e);
    }
    return result;
  }

};
