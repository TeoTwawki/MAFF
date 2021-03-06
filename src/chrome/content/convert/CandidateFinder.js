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
 * Locates the saved web pages that are candidates for batch conversion between
 * different file formats.
 */
function CandidateFinder() {
  // Initialize the contained objects.
  this.location = new CandidateLocation();
  this.sourceFormats = [];
  // Initialize the list of valid suffixes for the support folders.
  this.sourceDataFolderSuffixes = Prefs.convertDataFolderSuffixesArray;
  // Add the files folder suffix for the current locale, if not the default.
  var localizedFolderSuffix = Cc["@mozilla.org/intl/stringbundle;1"].
   getService(Ci.nsIStringBundleService).
   createBundle("chrome://global/locale/contentAreaCommands.properties").
   formatStringFromName("filesFolder", [""], 1);
  if (localizedFolderSuffix && localizedFolderSuffix != "_files") {
    this.sourceDataFolderSuffixes.push(localizedFolderSuffix);
  }
}

CandidateFinder.prototype = {
  /**
   * Array representing the source formats of the files to be converted.
   *
   * Possible values:
   *   "complete"   - Complete web page, only if a support folder is present.
   *   "mhtml"      - MHTML archive.
   *   "maff"       - MAFF archive.
   */
  sourceFormats: null,

  /**
   * String representing the destination format of the converted files.
   *
   * Possible values:
   *   "maff"       - MAFF archive.
   *   "mhtml"      - MHTML archive.
   *   "complete"   - Plain web page. A support folder is created if required.
   */
  destFormat: "maff",

  /**
   * CandidateLocation object representing the root directories involved in the
   * conversion operation.
   */
  location: null,

  /**
   * True if the subfolders of the source folder must be sought too.
   */
  sourceIncludeSubfolders: true,

  /**
   * Array containing the suffixes used for recognizing the support folders in
   * the source tree, for example "_files".
   */
  sourceDataFolderSuffixes: [],

  /**
   * This iterator yields the Candidate objects corresponding to the convertible
   * files under the root search location. Sometimes a null value will be
   * returned instead of a candidate to allow the caller to keep the user
   * interface responsive while the search is in progress.
   */
  __iterator__: function() {
    // Delegate the generation to the parameterized worker.
    for (var item in this._candidatesGenerator(this.location)) {
      yield item;
    }
  },

  /**
   * This generator function yields the Candidate objects corresponding to the
   * convertible files under the specified location. Sometimes a null value will
   * be returned instead of a candidate to allow the caller to keep the user
   * interface responsive while the search is in progress.
   */
  _candidatesGenerator: function(aLocation) {
    // Enumerate all the files and subdirectories in the specified directory,
    // and generate three separate lists: one for folder names, one for file
    // names, and a string containing the concatenation of all the file names,
    // for faster access when searching for a particular file name in folders
    // containing many files.
    var dirEntries;
    try {
      dirEntries = aLocation.source.directoryEntries;
    } catch (e) {
      // The specified source directory may be inaccessible.
      return;
    }
    var subdirs = {};
    var files = {};
    var filesList = "::";
    while (dirEntries.hasMoreElements()) {
      var dirEntry = dirEntries.getNext().QueryInterface(Ci.nsIFile);
      try {
        // Add the entry to the appropriate lists.
        if (dirEntry.isDirectory()) {
          // Exclude the bin folder when it is a subfolder of the source.
          if (!this.location.bin || !dirEntry.equals(this.location.bin)) {
            subdirs[dirEntry.leafName] = true;
          }
        } else {
          files[dirEntry.leafName] = true;
          filesList += dirEntry.leafName + "::";
        }
      } catch (e) {
        // Inaccessible directories or invalid file names returned by the
        // iterator may generate an exception when checking isDirectory.
      }
      // Avoid blocking the user interface while scanning crowded folders.
      yield null;
    }

    // Examine every available subfolder.
    for (var [subdirName] in Iterator(subdirs)) {
      // Ensure that the enumeration result is a JavaScript string.
      subdirName = "" + subdirName;
      // If the subfolder is a support folder for an existing web page
      var name = this._isSupportFolderName(subdirName, filesList);
      if (name) {
        // If the search should include web pages among the source files
        if (this.sourceFormats.includes("complete")) {
          // Check that the associated source file has not been already used
          // together with another support folder.
          if (files[name]) {
            // Generate a new candidate for conversion.
            yield this._newCandidate("complete", aLocation, name, subdirName);
            // Ensure that the file will not be used again as a candidate later.
            delete files[name];
          }
        }
      } else if (this.sourceIncludeSubfolders) {
        // If required, examine the contents of this subfolder recursively. The
        // contents of support folders for data files are never examined, even
        // if the folder is not returned as a candidate for conversion.
        var newLocation = aLocation.getSubLocation(subdirName);
        for (var item in this._candidatesGenerator(newLocation)) {
          yield item;
        }
      }
    }

    // Examine every remaining file.
    for (var [fileName] in Iterator(files)) {
      // Ensure that the enumeration result is a JavaScript string.
      fileName = "" + fileName;
      // Continue if the file name matches the criteria.
      let sourceFormat = this._formatFromFileName(fileName);
      if (!this.sourceFormats.includes(sourceFormat)) {
        continue;
      }
      // Complete web pages are always converted without reading any metadata.
      if (sourceFormat == "complete") {
        yield this._newCandidate(sourceFormat, aLocation, fileName);
        continue;
      }
      try {
        // Refresh the user interface just before opening the archive.
        yield null;
        // Extract only the metadata from the archive.
        var archiveFile = aLocation.source.clone();
        archiveFile.append(fileName);
        var archive = sourceFormat == "maff" ? new MaffArchive(archiveFile) :
         new MhtmlArchive(archiveFile);
        archive.extractAll(true);
        // Generate new candidates for conversion.
        var binCountdown = { count: archive.pages.length };
        for (var i = 0; i < archive.pages.length; i++) {
          yield this._newCandidate(sourceFormat, aLocation, fileName, null, i,
           binCountdown, archive.pages[i].indexLeafName);
        }
      } catch (ex) {
        Cu.reportError(ex);
      }
    }
  },

  /**
   * Creates a new candidate with the given properties.
   */
  _newCandidate: function(aSourceFormat, aParentLocation, aLeafName,
   aDataFolderLeafName, aPageIndex, aBinCountdown, aIndexLeafName) {
    // Create a Candidate object for the requested file formats.
    var candidate = new Candidate();
    candidate.sourceFormat = aSourceFormat;
    candidate.destFormat = this.destFormat;
    candidate.binCountdown = aBinCountdown;
    candidate.pageIndex = aPageIndex || 0;
    candidate.indexLeafName = aIndexLeafName || "";
    // Set the actual file names based on the file formats.
    candidate.setLocation(aParentLocation, aLeafName, aDataFolderLeafName);
    // Check if the destination or bin files already exist.
    candidate.checkObstructed();
    // Return the newly generated candidate.
    return candidate;
  },

  /**
   * Checks the extension in the given file name and returns a format name.
   */
  _formatFromFileName: function(aLeafName) {
    // Checks the extension case-insensitively.
    return /\.mht(ml)?$/i.test(aLeafName) ? "mhtml" :
     /\.maff$/i.test(aLeafName) ? "maff" : "";
  },

  /**
   * Returns true if the given directory name contains the data files of an
   * existing complete web page. The aFilesList parameter is a string containing
   * the concatenation of all the files.
   */
  _isSupportFolderName: function(aLeafName, aFilesList) {
    // Try with all the possible suffixes in order.
    for (var [, suffix] in Iterator(this.sourceDataFolderSuffixes)) {
      // Checks the suffix case-sensitively.
      if (aLeafName.slice(-suffix.length) != suffix) {
        continue;
      }
      // Extract the base folder name without the suffix.
      var basePart = aLeafName.slice(0, -suffix.length);
      if (!basePart) {
        continue;
      }
      // Look into the provided list of file names to find the associated file.
      var endPosition = 0;
      while (true) {
        // Search case-sensitively for a file name that begins with the base
        // name obtained from the support folder name.
        var position = aFilesList.indexOf("::" + basePart, endPosition);
        if (position < 0) {
          break;
        }
        // A file name was found, extract it from the list.
        var startPosition = position + "::".length;
        endPosition = aFilesList.indexOf("::", startPosition);
        var fileName = aFilesList.slice(startPosition, endPosition);
        var lastPart = fileName.slice(basePart.length);
        // Match names without extension or with one of the known extensions.
        if (!lastPart || /\.(x?html|xht|htm|xml|svgz?)$/i.test(lastPart)) {
          return fileName;
        }
      }
      // Either a comaptible file name was not found, or a file name that does
      // not match one of the known extensions was found.
      return false;
    }
    // The given name is not one of a support folder.
    return false;
  },
}
