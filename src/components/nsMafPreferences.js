/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.6.1
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

// Provides MAF Preferences management services

const mafPreferencesContractID = "@mozilla.org/maf/preferences_service;1";
const mafPreferencesCID = Components.ID("{34ea8b6d-e6c3-47e3-83ae-03e3b97dbb56}");
const mafPreferencesIID = Components.interfaces.nsIMafPreferences;

var MafPreferencesService = null;

var MafStrBundle = null;

/**
 * The MAF preferences.
 */
function MafPreferencesServiceClass() {

}

MafPreferencesServiceClass.prototype = {

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
     /** 3 - The first page in a tab. Used if the first page is known to be a TOC, index or main page. */

  OPENMODE_NOTHING: 0,

  OPENMODE_ALLTABS: 1,

  OPENMODE_SHOWDIALOG: 2,

  OPENMODE_FIRSTPAGE: 3,

  /** URL Rewrite enabled. */
  urlRewrite: true,

  /** Save extended metadata. */
  saveExtendedMetadata: false,

  /** Windows specific preferences. */
  win_invisible: true,

  win_wscriptexe: "",

  win_invisiblevbs: "",

  isLoaded: false,

  clearTempOnClose: true,

  enableMafProtocol: false,

  addDocumentWriteOverride: false,

  alertOnArchiveComplete: true,

  alternative_save_component: false,

  win_associate_maff: false,

  win_associate_mht: false,

  getRecordsLength: function() {
    return this.programExtensions.length;
  },

  getRecordAt: function(index) {
    var result;
    try {
      result = Components.classes["@mozilla.org/maf/preferences_rec;1"]
                 .createInstance(Components.interfaces.nsIMafPreferencesRec);

      if ((index < 0) || (index >= this.programExtensions.length)) {
        // throw error index out of range
      } else {
        result.id = this.programExtensions[index][0];
        result.archivescript = this.programExtensions[index][1];
        result.extractscript = this.programExtensions[index][2];
        for (var i=0; i<this.programExtensions[index][3].length; i++) {
          result.addExtension(this.programExtensions[index][3][i]);
        }
      }

    } catch(e) {
      mafdebug(e);
    }
    return result;
  },

  updateRecordAt: function(index, newRec) {
    try {
      var prefRec = newRec.QueryInterface(Components.interfaces.nsIMafPreferencesRec);

      if ((index < 0) || (index >= this.programExtensions.length)) {
        // throw error index out of range
      } else {
        this.programExtensions[index][0] = prefRec.id;
        this.programExtensions[index][1] = prefRec.archivescript;
        this.programExtensions[index][2] = prefRec.extractscript;

        this.programExtensions[index][3] = new Array();

        for (var i=0; i<prefRec.getExtensionsLength(); i++) {
          this.programExtensions[index][3].push(prefRec.getExtensionAt(i));
        }
      }

    } catch(e) {
      mafdebug(e);
    }
  },

  addRecord: function(newRec) {
    try {
      var prefRec = newRec.QueryInterface(Components.interfaces.nsIMafPreferencesRec);

      var index = this.programExtensions.length;

      this.programExtensions[index][0] = prefRec.id;
      this.programExtensions[index][1] = prefRec.archivescript;
      this.programExtensions[index][2] = prefRec.extractscript;

      this.programExtensions[index][3] = new Array();

      for (var i=0; i<prefRec.getExtensionsLength(); i++) {
        this.programExtensions[index][3].push(prefRec.getExtensionAt(i));
      }
    } catch(e) {
      mafdebug(e);
    }
  },

/*
  removeRecordAt: function(index) {
    this.programExtensions = this.programExtensions.slice(index, 1);
  },
*/

  getOpenFiltersLength: function() {
    return (this.programExtensions.length + 1);
  },


  getOpenFilterAt: function(index, count, result) {
   try {
    if (index >= 0) {
      if (index == 0) {
        var outarray = new Array();
        outarray.push("MAF " + MafStrBundle.GetStringFromName("archives"));
        outarray.push("*.maff; *.maf");
        outarray.push("" + this.defaultMAFExtensionIndex);

        result.value = outarray;
        count.value = result.value.length;

      } else {
        if (index <= this.programExtensions.length) {
          var i = index - 1;

          var outarray = new Array();
          outarray.push("MAF " + this.programExtensions[i][0] + " " + MafStrBundle.GetStringFromName("archives"));

          // Construct a string like "*.zip.maf; *.maf.zip"
          var additionalExts = "";
          for (var j=0; j<this.programExtensions[i][3].length; j++) {
            if (additionalExts == "") {
              additionalExts = this.programExtensions[i][3][j];
            } else {
              additionalExts += "; " + this.programExtensions[i][3][j];
            }
          }

          outarray.push(additionalExts);

          // Add associated program extension index
          outarray.push("" + i);

          result.value = outarray;
          count.value = result.value.length;

        } else {
          // Error index out of bounds
        }
      }
    } else {
      // Error index out of bounds
    }
   } catch(e) {
     mafdebug(e);
   }
  },

  /**
   * Creates a multi-dimensional array holding info on each registered program
   */
  getOpenFilters: function() {
    var result = [ ["MAF " + MafStrBundle.GetStringFromName("archives"), "*.maff; *.maf", this.defaultMAFExtensionIndex] ];
    for (var i=0; i<this.programExtensions.length; i++) {
      var entry = ["MAF " + this.programExtensions[i][0] + " " + MafStrBundle.GetStringFromName("archives")];

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
    var regExStr = "^.+\\.maff?$"; // Matches *.maff and *.maf

    for (var i=0; i<this.programExtensions.length; i++) {
      for (var j=0; j<this.programExtensions[i][3].length; j++) {
        var progRegEx = this.programExtensions[i][3][j];
        progRegEx = progRegEx.replaceAll(".", "\\.").replaceAll("*", ".+");
        regExStr += "|^" + progRegEx + "$";
      }
    }

    return regExStr;
  },

  getSaveFiltersLength: function() {
    var result = 1; // *.maff
    for (var i=0; i<this.programExtensions.length; i++) {
      result += this.programExtensions[i][3].length;
    }

    return result;
  },


  getSaveFilterAt: function(index, count, result) {
    try {

    if (index >= 0) {
      if (index == 0) {
        var outarray = new Array();
        outarray.push("MAF " + MafStrBundle.GetStringFromName("archives"));
        outarray.push("*.maff");
        outarray.push("" + this.defaultMAFExtensionIndex);

        result.value = outarray;
        count.value = result.value.length;

      } else {

        var total = 0;
        for (var i=0; i<this.programExtensions.length; i++) {
          for (var j=0; j<this.programExtensions[i][3].length; j++) {
            total += 1;
            if (index == total) {
              var outarray = new Array();
              outarray.push("MAF " + this.programExtensions[i][0] + " " + MafStrBundle.GetStringFromName("archives"));
              outarray.push(this.programExtensions[i][3][j]);
              outarray.push("" + i);

              result.value = outarray;
              count.value = result.value.length;

              break; break;
            }
          }
        }

      }
    } else {

    }
    } catch(e) { }
  },


  /**
   * Creates a multi-dimensional array holding info on each registered program
   */
  getSaveFilters: function() {
    var result = [ ["MAF " + MafStrBundle.GetStringFromName("archives"), "*.maff", this.defaultMAFExtensionIndex] ];

    // Each unique extension has its own entry
    for (var i=0; i<this.programExtensions.length; i++) {
      for (var j=0; j<this.programExtensions[i][3].length; j++) {
        var entry = ["MAF " + this.programExtensions[i][0] + " " + MafStrBundle.GetStringFromName("archives"), this.programExtensions[i][3][j], i];
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
    var result = null;
    try {
      var selProgExt = this.programExtensions[filters[index][2]];
      result = selProgExt[2];
    } catch(e) {

    }
    return result;
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
   * Returns a structure holding the default values of the prefs.
   */
  defaultValues: function() {
    var result;
    result = new MafPreferencesServiceClass();

    result.programExtensions = new Array();
    result.archiveOpenMode = 1;
    result.urlRewrite = true;
    result.saveExtendedMetadata = false;

    result.win_invisible = true;
    result.win_wscriptexe = "";
    result.win_invisiblevbs = "";
    result.clearTempOnClose = true;
    result.enableMafProtocol = false;
    result.addDocumentWriteOverride = false;
    result.alertOnArchiveComplete = true;

    result.alternative_save_component = false;
    result.win_associate_maff = false;
    result.win_associate_mht = false;

      var mafParentDir = this._getProfileDir();
      // Default if there's no stored prefs

      result.defaultMAFExtensionIndex = 0;

      try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService).getBranch("maf.");

        var navigatorUserAgent = prefs.getCharPref("general.useragent");
      } catch(e) {
        navigatorUserAgent = " Windows ";
      }

      // If not on windows
      if (navigatorUserAgent.indexOf("Windows") == -1) {
        result.temp = mafParentDir + "/maf/maftemp/";
        result.programExtensions[result.programExtensions.length] = [
           "Zip", mafParentDir + "/maf/mafzip.sh", mafParentDir + "/maf/mafunzip.sh", ["*.maff.zip"]];
      } else {
        result.temp = mafParentDir + "\\maf\\maftemp\\";
        result.programExtensions[result.programExtensions.length] = [
           "Zip", mafParentDir + "\\maf\\mafzip.bat", mafParentDir + "\\maf\\mafunzip.bat", ["*.maff.zip"]];
        result.win_wscriptexe = "c:\\windows\\system32\\wscript.exe",
        result.win_invisiblevbs = mafParentDir + "\\maf\\invis.vbs"
      };

    return result;
  },

  /**
   * Load the preferences from the user prefs.
   */
  load: function() {
    // if (!this.isLoaded) {
    this.programExtensions = new Array();

      var mafParentDir = this._getProfileDir();
      // Default if there's no stored prefs

      this.defaultMAFExtensionIndex = 0;


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
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService).getBranch("maf.");

        var navigatorUserAgent = prefs.getCharPref("general.useragent");
      } catch(e) {
        navigatorUserAgent = " Windows ";
      }

      try {

      // If not on windows
      if (navigatorUserAgent.indexOf("Windows") == -1) {
        this.temp = mafParentDir + "/maf/maftemp/";
        this.programExtensions[this.programExtensions.length] = [
           "Zip", mafParentDir + "/maf/mafzip.sh", mafParentDir + "/maf/mafunzip.sh", ["*.maff.zip"]];
      } else {
        this.temp = mafParentDir + "\\maf\\maftemp\\";
        this.programExtensions[this.programExtensions.length] = [
           "Zip", mafParentDir + "\\maf\\mafzip.bat", mafParentDir + "\\maf\\mafunzip.bat", ["*.maff.zip"]];
        this.win_wscriptexe = "c:\\windows\\system32\\wscript.exe",
        this.win_invisiblevbs = mafParentDir + "\\maf\\invis.vbs"
      };

        this.temp = prefs.getCharPref("temp");
        this.urlRewrite = prefs.getBoolPref("urlrewrite");
        this.saveExtendedMetadata = prefs.getBoolPref("saveextendedmetadata");
        this.defaultMAFExtensionIndex = prefs.getIntPref("defaultmafhandler");
        this.archiveOpenMode = prefs.getIntPref("archiveopenmode");

        this.win_invisible = prefs.getBoolPref("wininvisible");
        this.win_wscriptexe = prefs.getCharPref("winwscriptexe");
        this.win_invisiblevbs = prefs.getCharPref("wininvisiblevbs");

        this.clearTempOnClose = prefs.getBoolPref("clearTempOnClose");
        this.enableMafProtocol = prefs.getBoolPref("enableMafProtocol");
        this.addDocumentWriteOverride = prefs.getBoolPref("addDocumentWriteOverride");
        this.alertOnArchiveComplete = prefs.getBoolPref("alertOnArchiveComplete");

        this.alternative_save_component = prefs.getBoolPref("useAlternativeSaveComponent");

        this.win_associate_maff = prefs.getBoolPref("winassociatemaff");
        this.win_associate_mht = prefs.getBoolPref("winassociatemht");

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
        // mafdebug(e);
      }

    // Add MHT as the last archive format supported

      try {
        this.programExtensions[this.programExtensions.length] = [
            "MHT",
              Components.classes["@mozilla.org/libmaf/encoder;1?name=mht"]
               .createInstance(Components.interfaces.nsIMafMhtEncoder).PROGID,
             Components.classes["@mozilla.org/libmaf/decoder;1?name=mht"]
               .createInstance(Components.interfaces.nsIMafMhtDecoder).PROGID,
             ["*.mht"]];
      } catch(e) {
        mafdebug(e);
      }

    //  this.isLoaded = true;
    //}
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

      var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService).getBranch("maf.");

      prefs.setCharPref("temp", this.temp);
      prefs.setBoolPref("urlrewrite", this.urlRewrite);
      prefs.setBoolPref("saveextendedmetadata", this.saveExtendedMetadata);
      prefs.setIntPref("defaultmafhandler", this.defaultMAFExtensionIndex);
      prefs.setIntPref("archiveopenmode", this.archiveOpenMode);

      prefs.setBoolPref("wininvisible", this.win_invisible);
      prefs.setCharPref("winwscriptexe", this.win_wscriptexe);
      prefs.setCharPref("wininvisiblevbs", this.win_invisiblevbs);

      prefs.setBoolPref("clearTempOnClose", this.clearTempOnClose);
      prefs.setBoolPref("enableMafProtocol", this.enableMafProtocol);
      prefs.setBoolPref("addDocumentWriteOverride", this.addDocumentWriteOverride);
      prefs.setBoolPref("alertOnArchiveComplete", this.alertOnArchiveComplete);

      prefs.setBoolPref("useAlternativeSaveComponent", this.alternative_save_component);

      prefs.setBoolPref("winassociatemaff", this.win_associate_maff);
      prefs.setBoolPref("winassociatemht", this.win_associate_mht);

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
      mafdebug(e);
    }
  },

  _getProfileDir: function() {
    const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
    try {
      var result = (new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path;
    } catch (e) {
      result = "";
      mafdebug(e);
    }
    return result;
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafPreferencesIID) &&
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

var MAFPreferencesFactory = new Object();

MAFPreferencesFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafPreferencesIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafPreferencesService == null) {
    MafPreferencesService = new MafPreferencesServiceClass();
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }

  try {
    if (!MafPreferencesService.isLoaded) { MafPreferencesService.load(); }
  } catch(e) { mafdebug(e); }

  return MafPreferencesService.QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFPreferencesModule = new Object();

MAFPreferencesModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafPreferencesCID,
                                  "MafPreferences JS Component",
                                  mafPreferencesContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFPreferencesModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafPreferencesCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFPreferencesFactory;
};

MAFPreferencesModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFPreferencesModule;
};

