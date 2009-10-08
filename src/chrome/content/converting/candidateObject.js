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
 * Represents a saved page that can be converted from one format to another.
 */
function Candidate() {

}

Candidate.prototype = {

  // --- Public methods and properties ---

  /**
   * String representing the source format of the file to be converted.
   *
   * Possible values:
   *   "complete"   - Complete web page, only if a support folder is present.
   *   "plain"      - Any web page, with or without a support folder.
   *   "mhtml"      - MHTML archive.
   *   "maff"       - MAFF archive.
   */
  sourceFormat: "complete",

  /**
   * String representing the destination format of the converted file.
   *
   * Possible values:
   *   "maff"       - MAFF archive.
   *   "mhtml"      - MHTML archive.
   *   "complete"   - Plain web page. A support folder is created if required.
   */
  destFormat: "maff",

  /**
   * String representing the relative path, with regard to the root search
   *  location, of the folder where the candidate is located.
   */
  relativePath: "",

  /**
   * CandidateLocation object for the main file.
   */
  location: null,

  /**
   * CandidateLocation object for the support folder, if applicable.
   */
  dataFolderLocation: null,

  /**
   * True if one of the destination files or support folders already exists.
   */
  obstructed: false,

  /**
   * Identifier of the candidate in the candidates data source.
   */
  internalIndex: 0,

  /**
   * Sets the location of the source, destination and bin files based on the
   *  given parameters and the current source and destination file formats.
   *
   * @param aParentLocation       CandidateLocation object pointing to the
   *                               parent folder that contains the candidate.
   * @param aLeafName             File name of the candidate.
   * @param aDataFolderLeafName   Name of the folder containing the support
   *                               files required by the main document. If
   *                               unspecified, no support folder is present.
   */
  setLocation: function(aParentLocation, aLeafName, aDataFolderLeafName) {
    // Set the initial location, relevant for the source and bin paths
    this.relativePath = aParentLocation.relativePath;
    this.location = aParentLocation.getSubLocation(aLeafName);

    // Set the location of the source support folder, if present
    if (aDataFolderLeafName) {
      this.dataFolderLocation = aParentLocation.getSubLocation(
       aDataFolderLeafName);
      this.dataFolderLocation.dest = null;
    }

    // Determine the correct extension for the destination file
    var destExtension;
    switch (this.destFormat) {
      case "mhtml":
        destExtension = Prefs.saveUseMhtmlExtension ? "mhtml" : "mht";
        break;
      case "maff":
        destExtension = "maff";
        break;
      default:
        switch (this.sourceFormat) {
          case "mhtml":
          case "maff":
            // TODO: Open the source archive and determine the extension
            destExtension = "html";
            break;
          default:
            throw "Unexpected combination of file formats for conversion";
        }
    }

    // Determine the base name from the provided source leaf name
    var leafNameWithoutExtension = aLeafName.replace(/\.[^.]*$/, "");

    // Modify the destination location with the correct file name
    var destLeafName = leafNameWithoutExtension + "." + destExtension;
    this.location.dest = aParentLocation.getSubLocation(destLeafName).dest;

    // If the destination can be a complete web page with a support folder
    if (this.destFormat == "complete") {
      // The source data folder location should not be present
      if (this.dataFolderLocation) {
        throw "Unexpected specified for archive source file";
      }
      // Determine the name of the destination support folder for data files
      var destFolderName = Cc["@mozilla.org/intl/stringbundle;1"].
       getService(Ci.nsIStringBundleService).
       createBundle("chrome://global/locale/contentAreaCommands.properties").
       formatStringFromName("filesFolder", [leafNameWithoutExtension], 1);
      // Set the data folder location, where only the destination is relevant
      this.dataFolderLocation = aParentLocation.getSubLocation(destFolderName);
      this.dataFolderLocation.source = null;
      this.dataFolderLocation.bin = null;
    }
  },

  /**
   * Sets the "obstructed" property based on the existence of the destination
   *  or bin files.
   */
  checkObstructed: function() {
    // Assume that the destination is obstructed
    this.obstructed = true;
    // Check if the destination file already exists
    if (this.location.dest.exists()) {
      return;
    }
    // Check if the bin file already exists
    if (this.location.bin && this.location.bin.exists()) {
      return;
    }
    // If no support folder for data files is present, exit now
    if (!this.dataFolderLocation) {
      this.obstructed = false;
      return
    }
    // Check if the destination support folder already exists
    if (this.dataFolderLocation.dest && this.dataFolderLocation.dest.exists()) {
      return;
    }
    // Check if the bin support folder already exists
    if (this.dataFolderLocation.bin && this.dataFolderLocation.bin.exists()) {
      return;
    }
    // The destination files are not already present
    this.obstructed = false;
  },

  /**
   * Starts the actual conversion process. When the process is finished, the
   *  given function is called, passing true if the operation succeeded, or
   *  false if the operation failed.
   */
  convert: function(aCompleteFn) {
    try {
      // Ensure that the destination file does not exist
      if (this.location.dest.exists()) {
        throw new Components.Exception(
          "The destination location is unexpectedly obstructed.");
      }
      // Ensure that the destination support folder does not exist
      if (this.dataFolderLocation && this.dataFolderLocation.dest &&
       this.location.dest.exists()) {
        throw new Components.Exception(
          "The destination location is unexpectedly obstructed.");
      }
      // TODO: Implement the actual conversion
      this.location.source.copyTo(this.location.dest.parent,
       this.location.dest.leafName);
      // Conversion completed successfully, move the source to the bin folder
      this._moveToBin();
    } catch (e) {
      // An error occurred while converting or completing the operation
      this._reportConversionError(e);
      // Report that the conversion of this candidate failed and exit
      aCompleteFn(false);
      return;
    }
    // Report that the conversion was successful
    aCompleteFn(true);
  },

  /**
   * Cancels the currently running conversion process, if any. The finish
   *  callback function will not be called in this case.
   */
  cancelConversion: function() {
    // TODO: Implement the actual conversion
  },

  // --- Private methods and properties ---

  /**
   * Moves the source file and support folder to the bin folder, if required.
   */
  _moveToBin: function() {
    // Move the source file to the bin folder
    if (this.location.bin) {
      // Ensure that the destination does not exist
      if (this.location.bin.exists()) {
        throw new Components.Exception(
          "The bin location is unexpectedly obstructed.");
      }
      // Move the file as required
      this.location.source.moveTo(this.location.bin.parent,
       this.location.bin.leafName);
    }
    // Move the source support folder, if present, to the bin folder
    if (this.dataFolderLocation) {
      if (this.dataFolderLocation.source && this.dataFolderLocation.bin) {
        // Ensure that the destination does not exist
        if (this.dataFolderLocation.bin.exists()) {
          throw new Components.Exception(
            "The bin location is unexpectedly obstructed.");
        }
        // Move the folder as required
        this.dataFolderLocation.source.moveTo(
         this.dataFolderLocation.bin.parent,
         this.dataFolderLocation.bin.leafName);
      }
    }
  },

  /**
   * Reports the given exception that occurred during the conversion of this
   *  candidate, providing additional information about the error.
   */
  _reportConversionError: function(aException) {
    try {
      // Determine the first part of the message for the Error Console
      var messagePrefix = "The following error occurred while converting\n" +
       this.location.source.path + ":\n\n";
      // Report the complete message appropriately
      if (aException instanceof Ci.nsIXPCException) {
        Cu.reportError(new Components.Exception(messagePrefix +
         aException.message, aException.result, aException.location,
         aException.data, aException.inner));
      } else {
        Cu.reportError(messagePrefix + aException);
      }
    } catch (e) {
      // In case of errors, report only the original exception
      Cu.reportError(aException);
    }
  }
}