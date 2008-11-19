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

// Provides MAF Preferences management services

function GetMafPreferencesServiceClass() {
  if (!sharedData.MafPreferencesService) {
    sharedData.MafPreferencesService = new MafPreferencesServiceClass();
  }
  return sharedData.MafPreferencesService;
}

/**
 * The MAF preferences.
 */
function MafPreferencesServiceClass() {

}

MafPreferencesServiceClass.prototype = {

  /** Structured array with information on supported file formats.
   *
   * [i] = (Array) A file format definition
   * [i][0] = (String) File format display name
   * [i][1] = (String) "Program" used when saving archives.
   * [i][2] = (String) "Program" used when opening archives.
   * [i][3] = (Array) List of file patterns associated with the file format.
   *
   * The basic "MAF" file format is not part of this array.
   *
   **/
  programExtensions: [
   ["Zip",
    "MAF",
    "MAF",
    ["*.maff.zip"]
   ],
   ["MHT",
    new MafMhtEncoderClass().PROGID,
    new MafMhtDecoderClass().PROGID,
    ["*.mht"]
   ]
  ],

  /** The extension that handles *.maf by default. */
  defaultMAFExtensionIndex: 0,

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
  }
};
