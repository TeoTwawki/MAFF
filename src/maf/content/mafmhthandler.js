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
 * Object that handles working with MHTs
 *
 * File format assumption: The only file with the content type text/html
 *                         is the main page
 */
var MafMHTHander = {

  MHT_ARCHIVE_PROG_ID: "Internal MHT Program Archive Handler",

  MHT_EXTRACT_PROG_ID: "Internal MHT Program Extract Handler",

  APPSIGNATURE: navigator.appCodeName + " " + navigator.appVersion,

  base64s: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

  /** Characters that are to be unaltered during quoted printable encoding */
  QPENCODE_UNALTERED: String.fromCharCode(32) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126),

  /** Characters that are to be unaltered during quoted printable encoding if they are the last char*/
  QPENCODE_UNALTEREDEND: String.fromCharCode(33) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126),

  /** The maximum number of characters before line wrap */
  QPENCODE_MAXLINESIZE: 76,

  /**
   * TODO: QP original url storage / usage
   */
  extractFromArchive: function(archivefile, destpath) {
    // Create destpath
    MafUtils.createDir(destpath);

    var dateTimeExpanded = new Date();
    var folderNumber = dateTimeExpanded.valueOf()+"_"+Math.floor(Math.random()*1000);

    realDestPath = MafUtils.appendToDir(destpath, folderNumber);

    MafUtils.createDir(realDestPath);

    // Create index.rdf in destpath
    var datasource = MafUtils.createRDF(realDestPath, "index.rdf");

    var index_filesDir = MafUtils.appendToDir(realDestPath,"index_files");
    // Create index_files
    MafUtils.createDir(index_filesDir);

    // Read file
    var MHTFile = MafUtils.readFile(archivefile);

    // Get headers
    var headerStr = "";
    var bodyStr = "";
    if (MHTFile.indexOf("\r\n\r\n") != -1) {
      headerStr = MHTFile.substring(0, MHTFile.indexOf("\r\n\r\n"));
      bodyStr = MHTFile.substring(MHTFile.indexOf("\r\n\r\n") + 4, MHTFile.length);
    } else if (MHTFile.indexOf("\n\n") != -1) {
      headerStr = MHTFile.substring(0, MHTFile.indexOf("\n\n"));
      bodyStr = MHTFile.substring(MHTFile.indexOf("\n\n") + 2, MHTFile.length);
    }

    var headerLines = headerStr.split(/\n/);
    var headerDetails = this._getHeaders(headerLines);

    var urlToLocalFilenameMap = new Array();

    var indexOriginalURL = "Unknown";

    var quotedPrintableMap = new Array();

    if (headerDetails["content-type"].indexOf("multipart/") == -1) {
      // Single file decoding
      try {
        if (headerDetails["content-transfer-encoding"] == "quoted-printable") {

          if (headerDetails["content-type"]!=null && headerDetails["content-type"].indexOf("text/html") >= 0) {
            // Create index.html
            MafUtils.createFile(MafUtils.appendToDir(realDestPath,"index.html"), this._decodeQuotedPrintable(bodyStr));
            urlToLocalFilenameMap[headerDetails["content-location"]] = MafUtils.appendToDir(realDestPath,"index.html");

            indexOriginalURL = headerDetails["content-location"];
          }
        }

        this._updateMetaData(headerStr, indexOriginalURL, datasource);
      } catch(e) {
        alert(e);
      }

    } else {
      // Multiple file decoding
      var decodeResult = this._decodeMultipartMimeFiles(headerDetails, MHTFile, index_filesDir, urlToLocalFilenameMap, quotedPrintableMap);

      indexOriginalURL = decodeResult.indexOriginalURL;
      urlToLocalFilenameMap = decodeResult.urlToLocalFilenameMap;
      quotedPrintableMap = decodeResult.quotedPrintableMap;

      // Rationalize absolute URLs to relative URLs
      for (var i=0; i<quotedPrintableMap.length; i++) {
        // For each quoted printable file
        var filename =  quotedPrintableMap[i];

        // Load the page contents in a string
        var contents = MafUtils.readFile(filename);

        try {
          contents = this.replaceUrls(contents, urlToLocalFilenameMap);
          // TODO: If the content type is text/html, get the original url of each page (could be framed)
          //       and add the original url as the base href
          // TODO: Save original url of every quoted printable object
          //contents = MafUtils.addBaseHref(contents, indexOriginalURL);
        } catch(e) {
          alert(e);
        }

        // Remove file
        MafUtils.deleteFile(filename);

        // Save page back
        MafUtils.createFile(filename, contents);
      }

      this._updateMetaData(decodeResult.headers, indexOriginalURL, datasource);
    }

  },

  /**
   * Get the boundary string used to separate MIME content from the content-type header
   */
  _getBoundaryStringFromHeader: function(ctheaderDetails) {
    // Get the boundary string
    var result = "";

    var contentTypeValues = ctheaderDetails.split(";");

      for (var i=0; i<contentTypeValues.length; i++) {
        if (contentTypeValues[i].indexOf("=") != -1) {
          // We have a name=value pair
          var name = contentTypeValues[i].substring(0, contentTypeValues[i].indexOf("=")).trim();
          var value = contentTypeValues[i].substring(contentTypeValues[i].indexOf("=") + 1,
                                                     contentTypeValues[i].length).trim();

          if (value.length > 1) {
            // Value should be quoted, unquote
            value = value.substring(1, value.length - 1);
          }

          if (name == "boundary") {
            result = value;
            break;
          }
        }

      }

    return result;
  },


  /**
   * Recursive function which decodes Multipart mime content
   * It creates the decoded files in the specified index files directory
   *   and stores meta-data in a result structure for post decoding processing
   */
  _decodeMultipartMimeFiles: function(headerDetails, MHTFile, index_filesDir, urlToLocalFilenameMap, quotedPrintableMap) {
    var result = {
      indexOriginalURL: "Unknown",
      urlToLocalFilenameMap: urlToLocalFilenameMap,
      quotedPrintableMap: quotedPrintableMap,
      headers: ""
    };

    var url = Components.classes[urlContractID].createInstance();
    url = url.QueryInterface(urlIID);

    var boundaryString = this._getBoundaryStringFromHeader(headerDetails["content-type"]);

    // Split using boundary string
    // End of part (--) and beginning of another (boundaryString)
    var singleFiles = MHTFile.split("--" + boundaryString);

    result.headers = singleFiles[0];

    // For each part
    for (var i=1; i<singleFiles.length; i++) {

      try {
        //  Get the content type and content location
        var headersAndBody = new Array();

        if (singleFiles[i].indexOf("\r\n\r\n")!=-1) {
          headersAndBody[0] = singleFiles[i].substring(0, singleFiles[i].indexOf("\r\n\r\n"));
          headersAndBody[1] = singleFiles[i].substring(singleFiles[i].indexOf("\r\n\r\n")+4, singleFiles[i].length);
        } else {
          headersAndBody[0] = singleFiles[i].substring(0, singleFiles[i].indexOf("\n\n"));
          headersAndBody[1] = singleFiles[i].substring(singleFiles[i].indexOf("\n\n")+2, singleFiles[i].length);
        }

          var headerLines = headersAndBody[0].split(/\n/);
          var headerDetails = this._getHeaders(headerLines);

          if (typeof(headerDetails["content-location"]) != "undefined") {

            url.spec = headerDetails["content-location"];

            //  Based on location guess the filename
            var localFilename = MafUtils.getUniqueFilename(index_filesDir ,getDefaultFileName(null, null, url, null));

            result.urlToLocalFilenameMap[headerDetails["content-location"]] = MafUtils.appendToDir(index_filesDir,localFilename);

            if (headerDetails["content-transfer-encoding"] == "base64") {

              // Get rid of the newlines
              var bodyLines = headersAndBody[1].split(/\r?\n/);

              var bodyData = "";
              for (var j=0; j<bodyLines.length; j++) {
                bodyData += bodyLines[j];
              }

              bodyLines = null;

              // Create The decoded file
              //  Decode the part and save as the filename in index_files
              MafUtils.createBinaryFile(MafUtils.appendToDir(index_filesDir,localFilename), this._decodeBase64(bodyData));

            } else if (headerDetails["content-transfer-encoding"] == "quoted-printable") {

                if (headerDetails["content-type"]!=null && headerDetails["content-type"].indexOf("text/html") >= 0) {
                  // Create index.html
                  MafUtils.createFile(MafUtils.appendToDir(realDestPath,"index.html"),
                                      this._decodeQuotedPrintable(headersAndBody[1]));
                  result.urlToLocalFilenameMap[headerDetails["content-location"]] =
                     MafUtils.appendToDir(realDestPath,"index.html");

                  result.indexOriginalURL = headerDetails["content-location"];
                } else {
                  //  Decode the part and save as the filename in index_files
                  MafUtils.createFile(MafUtils.appendToDir(index_filesDir,localFilename),
                                      this._decodeQuotedPrintable(headersAndBody[1]));
                }

                result.quotedPrintableMap[result.quotedPrintableMap.length] = result.urlToLocalFilenameMap[headerDetails["content-location"]];

            }

          } else if ((typeof(headerDetails["content-type"]) != "undefined") &&
                      (headerDetails["content-type"].indexOf("multipart/") >= 0)) {
              var multipartResult = this._decodeMultipartMimeFiles(headerDetails, headersAndBody[1], index_filesDir, result.urlToLocalFilenameMap, result.quotedPrintableMap);
              result.urlToLocalFilenameMap = multipartResult.urlToLocalFilenameMap;
              result.quotedPrintableMap = multipartResult.quotedPrintableMap;
              if (result.indexOriginalURL == "Unknown") {
                result.indexOriginalURL = multipartResult.indexOriginalURL;
              }
          }

      } catch(e) {
        alert(e);
      }
    }

    return result;
  },

  /**
   * Use a regular expression to replace absolute URLs with relative ones.
   * O(n) algorithm now instead of O(n^2).
   */
  replaceUrls: function(sourceString, urlToLocalFilenameMap) {
    var resultString = "";
    var unprocessedString = sourceString;
    var re = new RegExp("[a-z]+://[^>\"']+", "i"); // Absolute URL regular expression

    var m = re.exec(unprocessedString);
    while (m != null) {
      resultString += unprocessedString.substring(0, m.index);
      var originalUrl = m.toString();

      // TODO, decode anything else that might give trouble
      originalUrl = originalUrl.replaceAll("&amp;", "&");

      // Cater for Hashes
      var baseUrl = originalUrl.split("#")[0];
      var leftOver = originalUrl.split("#")[1];

      if (typeof(urlToLocalFilenameMap[baseUrl]) != "undefined") {
        resultString += MafUtils.getURIFromFilename(urlToLocalFilenameMap[baseUrl]);
        if (typeof(leftOver) != "undefined") {
          resultString += "#" + leftOver;
        }
      } else {
        resultString += m.toString();
      }

      unprocessedString = unprocessedString.substring(m.index + m.toString().length, unprocessedString.length);
      m = re.exec(unprocessedString);
    }

    resultString += unprocessedString;
    return resultString;
  },

  /**
   * Adds meta data gathered from the MHT to the RDF datasource used by MAF
   */
  _updateMetaData: function(headers, originalURL, datasource) {
    var result = "";
    var headerLines = headers.split(/\n/);
    var headerDetails = this._getHeaders(headerLines);

    // Add url data
    MafUtils.addStringData(datasource, "originalurl", originalURL);
    // Add title
    MafUtils.addStringData(datasource, "title", headerDetails["subject"]);
    // Add Date/Time archived data
    MafUtils.addStringData(datasource, "archivetime", headerDetails["date"]);
    // Add index file data
    MafUtils.addStringData(datasource, "indexfilename", "index.html");

    // Write changes to physical file
    datasource.Flush();

    return result;
  },

  /**
   * Tries to create an associative array of header => value pairs by parsing text.
   * Now cater for multi-line header values
   */
  _getHeaders: function(headerLines) {

    // Ensure that values that cross lines end up on only one line
    var normalizedHeaderLines = new Array();

    for (var i=0; i<headerLines.length; i++) {
      if (headerLines[i].indexOf(":") > 0) {
        normalizedHeaderLines[normalizedHeaderLines.length] = headerLines[i];
      } else {
        if (normalizedHeaderLines.length > 0) {
          normalizedHeaderLines[normalizedHeaderLines.length-1] += headerLines[i].trim();
        }
      }
    }

    var result = new Array();
    result["date"] = "Unknown";
    result["subject"] = "Unknown";
    for (var i=0; i<normalizedHeaderLines.length; i++) {
      var headerInfo = normalizedHeaderLines[i].split(/\:/);
      if (headerInfo.length>1) {
        // We have a header
        var headerInfoValue = headerInfo[1];
        for (var j=2; j<headerInfo.length; j++) {
          headerInfoValue += ":" + headerInfo[j];
        }
        result[headerInfo[0].trim().toLowerCase()] = headerInfoValue.trim();
      }

    }
    return result;
  },

  /**
   * Copied from FAQTs Knowledge Base
   * Source: http://www.faqts.com/knowledge_base/view.phtml/aid/1748
   * Authors: Jeff Wong, Thomas Loo, Louise Tolman, Martin Honnen, jsWalter
   */
  _decodeBase64: function(encodedString) {
    var result = new Array();

    try {
      var bits, decOut = new Array(), i = 0;
      for(; i<encodedString.length; i += 4) {
        bits = (this.base64s.indexOf(encodedString.charAt(i)) & 0xff) <<18 |
               (this.base64s.indexOf(encodedString.charAt(i +1)) & 0xff) <<12 |
               (this.base64s.indexOf(encodedString.charAt(i +2)) & 0xff) << 6 |
               this.base64s.indexOf(encodedString.charAt(i +3)) & 0xff;

        decOut.push((bits & 0xff0000) >>16);
        decOut.push((bits & 0xff00) >>8);
        decOut.push(bits & 0xff);
      }
      if(encodedString.charCodeAt(i -2) == 61)
        undecOut=decOut.slice(0, decOut.length -2);
      else if(encodedString.charCodeAt(i -1) == 61)
        undecOut=decOut.slice(0, decOut.length -1);
      else undecOut=decOut;

      result = undecOut;
    } catch(e) {
      alert(e);
    }
    return result;
  },


  /**
   * Copied from FAQTs Knowledge Base
   * Source: http://www.faqts.com/knowledge_base/view.phtml/aid/1748
   * Authors: Jeff Wong, Thomas Loo, Louise Tolman, Martin Honnen, jsWalter
   */
  _encodeBase64: function(decStr) {
    var result = "";

    try {
      var bits, dual, i = 0, encOut = '';

      while(decStr.length >= i + 3) {
        bits = (decStr[i++] & 0xff) <<16 |
               (decStr[i++] & 0xff) <<8  |
                decStr[i++] & 0xff;
        encOut += this.base64s.charAt((bits & 0x00fc0000) >>18) +
                  this.base64s.charAt((bits & 0x0003f000) >>12) +
                  this.base64s.charAt((bits & 0x00000fc0) >> 6) +
                  this.base64s.charAt((bits & 0x0000003f));
      }
      if (decStr.length -i > 0 && decStr.length - i < 3) {
        dual = Boolean(decStr.length -i -1);
        bits = ((decStr[i++] & 0xff) <<16) |
                (dual ? (decStr[i] & 0xff) <<8 : 0);
        encOut += this.base64s.charAt((bits & 0x00fc0000) >>18) +
                  this.base64s.charAt((bits & 0x0003f000) >>12) +
                  (dual ? this.base64s.charAt((bits & 0x00000fc0) >>6) : '=') + '=';
      }
      result = encOut;
    } catch(e) {
      alert(e);
    }

    if (encOut.length > this.QPENCODE_MAXLINESIZE) {
      // Split into lines of QPENCODE_MAXLINESIZE characters or less
      result = encOut.slice(0, this.QPENCODE_MAXLINESIZE);
      i = this.QPENCODE_MAXLINESIZE;
      while (i < encOut.length) {
        result += "\r\n" + encOut.slice(i, i + this.QPENCODE_MAXLINESIZE);
        i += this.QPENCODE_MAXLINESIZE;
      }
    }

    return result;
  },

  /**
   * Decode quoted printable text.
   */
  _decodeQuotedPrintable: function(encodedString) {
    var result;
    result = encodedString;
    // = sign followed by new line, replaced by nothing.
    result = result.replace(/=\r?\n/g, "");

    var equalsArray = result.split("=");
    var newresult = equalsArray[0];
    for (var i=1; i<equalsArray.length; i++) {
      if (equalsArray[i].length >= 2) {
        newresult += this._hexToDec(equalsArray[i].substring(0,2));
        if (equalsArray[i].length > 2) {
          newresult += equalsArray[i].substring(2,equalsArray[i].length);
        }
      }
    }

    return newresult;
  },

  /**
   * Encode text to be quoted printable.
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintable: function(srcString) {
    var result;
    result = "";

    var textLines = srcString.split(new RegExp("\r?\n","g"));
    for (var i=0; i<textLines.length; i++) {
      result += this._encodeQuotedPrintableLine(textLines[i]) + "\r\n";
    }

    return result;
  },

  /**
   * Encode a single line of text to be quoted printable.
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintableLine: function(srcLineString) {
    var result;
    result = "";

    if (srcLineString.length > 0) {
      var s = "";

      for (var i = 0; i<srcLineString.length-1; i++) {
        s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(i), this.QPENCODE_UNALTERED);
      }

      // Encode last character; if space, encode it
      s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(srcLineString.length-1), this.QPENCODE_UNALTEREDEND);

      result = s;

      if (s.length > this.QPENCODE_MAXLINESIZE) {

        // Split into lines of QPENCODE_MAXLINESIZE characters or less
        result = s.slice(0, this.QPENCODE_MAXLINESIZE);
        i = this.QPENCODE_MAXLINESIZE;

        // If either the last character, character before is =
        //   then we've split across a code - Bad idea for compatibility with
        //   streaming decoders who may see == or =A= or such and upchuck.
        if (result.charAt(result.length-1) == "=") {
          result = result.slice(0, result.length - 1);
          i -= 1;
        } else if (result.charAt(result.length-2) == "=") {
          result = result.slice(0, result.length - 2);
          i -= 2;
        }

        while (i < s.length) {
          result += "=\r\n" + s.slice(i, i + this.QPENCODE_MAXLINESIZE);
          i += this.QPENCODE_MAXLINESIZE;

          if (result.charAt(result.length-1) == "=") {
            result = result.slice(0, result.length - 1);
            i -= 1;
          } else if (result.charAt(result.length-2) == "=") {
            result = result.slice(0, result.length - 2);
            i -= 2;
          }
        }
      }

    }

    return result;
  },


  /**
   * Encode a character that isn't in range as a hex string
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintableCharacter: function(Character, UnAltered) {
    var x, Alter=true;
    for (var i=0; i<UnAltered.length; i+=2) {
      if (Character >= UnAltered.charCodeAt(i) && Character <= UnAltered.charCodeAt(i+1)) {
        Alter=false;
      }
    }

    if (!Alter) {
      return String.fromCharCode(Character);
    }

    x = Character.toString(16).toUpperCase();
    return (x.length == 1) ? "=0" + x : "=" + x;
  },

  /**
   * Convert a hex digit into decimal
   */
  _deHex: function(hexDigit) {
    return("0123456789ABCDEF".indexOf(hexDigit));
  },

  /**
   * Convert two digit hex code to ascii character
   */
  _hexToDec: function(hexString) {
    return String.fromCharCode((this._deHex(hexString.substring(0,1)) << 4) + this._deHex(hexString.substring(1,2)));
  },

  /**
   * Might do this eventually, for now, not supported XXXMHT
   * To implement:
   *  Make sure all available meta data is present
   *    - Missing some from MAF - Original URLs of saved resources - Not present. Arrg. Necessary?
   *                            - Content types of saved resources - Can be determined using MIME service
   *  Load RDF of saved archive files - DONE
   *  Content types of each resource file - DONE
   *  Generate boundary string - DONE
   *  Get subject (title) - DONE
   *  Base 64 encode binary data - DONE
   *  Quoted print html, css - DONE
   *
   */
  archiveDownload: function(archivefile, sourcepath) {

    var MHTContentString = "";
    var mainfileSubject = "Unknown";
    var dateArchived = "Unknown";
    var originalUrl = "";
    var indexfilename = "";

    var rdfdataresult = this._getMainFileMetaData(sourcepath);
    if (rdfdataresult["title"] != "") { mainfileSubject = rdfdataresult["title"]; }
    if (rdfdataresult["archivetime"] != "") { dateArchived = rdfdataresult["archivetime"]; }

    if (rdfdataresult["originalurl"] != "") { originalurl = rdfdataresult["originalurl"]; }
    if (rdfdataresult["indexfilename"] != "") { indexfilename = rdfdataresult["indexfilename"]; }

    var hasSupportingFiles = this._getHasSupportingFiles(sourcepath);

    var indexContentType = this._getFileContentType(sourcepath, indexfilename);

    var boundaryString = "";

    MHTContentString += "From: <Saved by " + this.APPSIGNATURE + ">\r\n";
    MHTContentString += "Subject: " + mainfileSubject + "\r\n";
    MHTContentString += "Date: " + dateArchived + "\r\n";
    MHTContentString += "MIME-Version: 1.0\r\n";

    if (hasSupportingFiles) {
      boundaryString = this._getBoundaryString();
      MHTContentString += "Content-Type: multipart/related;\r\n";
      MHTContentString += "\tboundary=\"" + boundaryString + "\";\r\n"
      MHTContentString += "\ttype=\"" + indexContentType + "\"\r\n";
      MHTContentString += "X-MAF: Produced By MAF MHT Archive Handler V0.3.0\r\n";
      MHTContentString += "\r\nThis is a multi-part message in MIME format.\r\n";
      MHTContentString += this._addFileToMHT(boundaryString, sourcepath, indexfilename, originalurl);

      try {
        var supportFileList = this._getSupportingFilesList(sourcepath, originalurl);
        // For each file supporting, add it
        for (var i=0; i<supportFileList.length; i++) {
          MHTContentString += this._addFileToMHT(boundaryString, sourcepath,
                                        supportFileList[i][0], supportFileList[i][1], supportFileList[i][2]);
        }
      } catch(e) {

      }

      // End file content
      MHTContentString += "\r\n--" + boundaryString + "--\r\n";
    } else {
      MHTContentString += "X-MAF: Produced By MAF MHT Archive Handler V0.3.0\r\n";
      MHTContentString += this._addFileToMHT("", sourcepath, indexfilename, originalurl);
    }

    MafUtils.createFile(MafUtils.getFullUniqueFilename(archivefile), MHTContentString);
  },

  /**
   * Bad hack. Need to modify the persist object code to return a list of the absolute urls replaced and their
   * new local urls. If there's an easier (and as reliable a) way to do this, someone please tell me.
   * In the mean time, make up a url so that IE and MAF decoding routines don't upchuck.
   *
   * @return a fake url where resources were found
   */
  _getBaseFakeUrl: function(originalurl) {
    var baseUrl = "";

    // Get a url without querystring or hash
    baseUrl = originalurl.trim();
    if (baseUrl.indexOf("?") > 0) {
      baseUrl = baseUrl.substring(0, baseUrl.indexOf("?"));
    }
    if (baseUrl.indexOf("#") > 0) {
      baseUrl = baseUrl.substring(0, baseUrl.indexOf("#"));
    }

    // If the last character isn't a /
    if (baseUrl.charAt(baseUrl.length-1) != "/") {
      // Append / to end
      baseUrl += "/";
    }

    return baseUrl;
  },

  /**
   * Returns an array of supporting index files
   * Does not generate real original addresses of index files - TODO FIX, somehow
   *   - See _getBaseFakeUrl
   */
  _getSupportingFilesList: function(sourcepath, originalurl) {
    var result = new Array();

    var baseUrl = this._getBaseFakeUrl(originalurl);

    var subDirList = new Array();
    subDirList[subDirList.length] = ["index_files"];

    while (subDirList.length > 0) {
      var subDirEntry = subDirList.pop();

      var oDir = Components.classes[localFileContractID].getService(localFileIID);
      oDir.initWithPath(MafPreferences.temp);
      oDir.append(sourcepath);
      for (var i=0; i<subDirEntry.length; i++) {
        oDir.append(subDirEntry[i]);
      }

      if (oDir.exists() && oDir.isDirectory()) {
        var entries = oDir.directoryEntries;

        while (entries.hasMoreElements()) {
          var currFile = entries.getNext();
          currFile.QueryInterface(localFileIID);

          if (!currFile.isDirectory()) {
            var originalUrl = baseUrl;
            for (var j=0; j<subDirEntry.length; j++) {
              originalUrl += subDirEntry[j] + "/";
            }
            originalUrl += currFile.leafName;
            result[result.length] = [currFile.leafName, originalUrl, subDirEntry];
          } else {
            var newSubDir = new Array();
            for (var j=0; j<subDirEntry.length; j++) {
              newSubDir[newSubDir.length] = subDirEntry[j];
            }
            newSubDir[newSubDir.length] = currFile.leafName;
            subDirList[subDirList.length] = newSubDir;
          }
        }

      }
    }

    return result;
  },

  /**
   * Add a supporting binary file to the MHT encoding
   */
  _addFileToMHT: function(boundaryString, sourcepath, filename, originalUrl, subdir) {
    var result = "";
    try {
      var thisFileContentType = this._getFileContentType(sourcepath, filename, subdir);
      var thisFileContentEncoding = this._getContentEncodingByType(thisFileContentType);

      if (boundaryString != "") {
        result += "\r\n--" + boundaryString + "\r\n";
      }

      if ((subdir != null) && (thisFileContentType == "text/html")) {
        result += "Content-Type: application/octet-stream\r\n";
      } else {
        result += "Content-Type: " + thisFileContentType + "\r\n";
      }
      result += "Content-Transfer-Encoding: " + thisFileContentEncoding + "\r\n";
      result += "Content-Location: " + originalUrl + "\r\n\r\n";


      var fullSourcePath = MafUtils.appendToDir(MafPreferences.temp, sourcepath);
      if (subdir != null) {
        for (var i=0; i<subdir.length; i++) {
          fullSourcePath = MafUtils.appendToDir(fullSourcePath, subdir[i]);
        }
      }
      var fullFilename = MafUtils.appendToDir(fullSourcePath, filename);

      var srcFile;

      if (thisFileContentEncoding == "quoted-printable") {
        srcFile =  MafUtils.readFile(fullFilename);
        // If the content type is text/html, probably has updatable links
        if (thisFileContentType == "text/html") {
          var supportFileList = this._getSupportingFilesList(sourcepath, originalurl);
          srcFile = this._updateRelativeResourceLinks(srcFile, supportFileList);
        }
        result += this._encodeQuotedPrintable(srcFile);
      } else { // Base64
        srcFile = MafUtils.readBinaryFile(fullFilename);
        result += this._encodeBase64(srcFile);
      }

      result += "\r\n";
    } catch(e) {
      alert(e);
    }
    return result;
  },


  /**
   * For each resource, search and replace all
   * @return srcFile with absolute links.
   */
  _updateRelativeResourceLinks: function(srcFile, supportFileList) {
    var result = srcFile;

    for (var i=0; i<supportFileList.length; i++) {
      var subdir = supportFileList[i][2][supportFileList[i][2].length-1];
      result = result.replaceAll(subdir + "/" + supportFileList[i][0], supportFileList[i][1]);
    }

    return result;
  },


  /**
   * Determine the MIME encoding to used based on the content type
   */
  _getContentEncodingByType: function(fileContentType) {
    var result = "base64";
    if (fileContentType == "text/html") { result = "quoted-printable"; }
    if (fileContentType == "text/css") { result = "quoted-printable"; }
    return result;
  },

  /**
   * Loads meta-data available from the saved archive
   */
  _getMainFileMetaData: function(sourcepath) {
    var indexrdffile = Components.classes[localFileContractID].getService(localFileIID);
    indexrdffile.initWithPath(MafPreferences.temp);
    indexrdffile.append(sourcepath);

    var uriPath = MafUtils.getURI(indexrdffile.nsIFile);

    indexrdffile.append("index.rdf");

    return MafState.getMetaDataFrom(indexrdffile, uriPath);
  },

  /**
   * Generates the boundary string used to seperate MIME parts
   */
  _getBoundaryString: function() {
    var result = "----=_NextPart_000_0000_";

    for (var i=0; i<8; i++) {
      result += this._hex(Math.floor(Math.random()*15));
    }
    result += ".";

    for (var i=0; i<8; i++) {
      result += this._hex(Math.floor(Math.random()*15));
    }
    return result;
  },

  /**
   * Convert a single decimal digit (0 to 15) into hex
   */
  _hex: function(decDigit) {
    if (decDigit >=0 && decDigit <= 15) {
      return("0123456789ABCDEF".charAt(decDigit));
    } else {
      return "0";
    }
  },

  /**
   * @return true if there are supporting files in archive file folder
   */
  _getHasSupportingFiles: function(sourcepath) {
    var result = false;
    var supportingFilesDirName = "index_files";

    try {
      var iDir = Components.classes[localFileContractID].getService(localFileIID);
      iDir.initWithPath(MafPreferences.temp);
      iDir.append(sourcepath);
      iDir.append(supportingFilesDirName);

      result = iDir.exists();
    } catch(e) {

    }

    return result;
  },

  /**
   * @return The content type for whatever file specified.
   */
  _getFileContentType: function(sourcepath, filename, subdir) {
    var result = "application/octet-stream";
    try {
      var ifile = Components.classes[localFileContractID].getService(localFileIID);
      ifile.initWithPath(MafPreferences.temp);
      ifile.append(sourcepath);
      if (subdir != null) {
        for (var i=0; i<subdir.length; i++) {
          ifile.append(subdir[i]);
        }
      }
      ifile.append(filename);

      result = MafUtils.getMIMETypeForURI(MafUtils.getURI(ifile.nsIFile));
    } catch(e) {
      alert(e);
    }

    return result;
  }

};
