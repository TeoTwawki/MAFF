/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.5.1
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

/* ***** BEGIN LICENSE BLOCK *****
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
 * The Original Code is ScrapBook.
 *
 * The Initial Developer of the Original Code is
 * Gomita.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): Christopher Ottley
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

// Provides An alternative to the WebBrowserPersist for saving complete pages

const mafWebBrowserPersistContractID = "@mozilla.org/libmaf/embedding/browser/nsWebBrowserPersist;1";
const mafWebBrowserPersistCID = Components.ID("{d23345ab-2d6c-4365-bc57-1c0529e73dad}");
const mafWebBrowserPersistIID = Components.interfaces.nsIWebBrowserPersist;

var MafUtils = null;

var MafStrBundle = null;

function MafWebBrowserPersistClass() {

};

MafWebBrowserPersistClass.prototype = {

  currentState: 0,
  persistFlags: null,
  progressListener: null,
  result: 0,

  cancelSave: function() {
    // Ignored for now.
  },

  saveDocument: function(document, file, dataPath, outputContentType, encodingFlags, wrapColumn) {
    this.document = document;
    this.baselocation = document.location.href;
    this.fileList = new Array();
    this.request = 0;
    this.characterSet = document.characterSet;

    // TODO: Cater for base tags
    // document.getElementsByTagName("base")[0].src

    const nsIWPL = Components.interfaces.nsIWebProgressListener;
    const nsIWBP = mafWebBrowserPersistIID;

    if (this.progressListener != null) {
      this.progressListener.onProgressChange(null, null, 1, 100, 1, 100);
      this.currentState = nsIWBP.PERSIST_STATE_READY;
      this.progressListener.onStateChange(null, null, nsIWPL.STATE_IS_NETWORK | nsIWPL.STATE_START, null);
    }

    var indexFile = file.QueryInterface(Components.interfaces.nsIFileURL).file;
    // By default files are stored in the same folder as the index file
    var dataPathFile = indexFile.parent;
    var dataPathStr = "";
    if (dataPath != null) {
      dataPath.QueryInterface(Components.interfaces.nsILocalFile);
      dataPathFile = dataPath;
      dataPathStr = dataPath.leafName + "/";
    }

    this.dataPathFile = dataPathFile;
    this.dataPathStr = dataPathStr;

    // Copy the DOM and modify the links to point to locally saved files
    var rootNode = document.getElementsByTagName("html")[0].cloneNode(true);

    // Recursively iterate through DOM nodes replacing links to resources
    // with local datapath files
    this.processDOMRecursively(rootNode, dataPathFile, dataPathStr);

    var mafCSScontent = "";
    var mafCSS = document.styleSheets;
    for ( var i=0; i < mafCSS.length; i++ ) {
      mafCSScontent += this.processCSSRecursively(mafCSS[i]);
    }

    if (mafCSScontent != "") {
      var newLinkNode = document.createElement("link");
      newLinkNode.setAttribute("media", "screen");
      // Make a relative link to the supporting file via the datapath

      newLinkNode.setAttribute("href", dataPathStr + "mafindex.css");
      newLinkNode.setAttribute("type", "text/css");
      newLinkNode.setAttribute("rel", "stylesheet");
      rootNode.firstChild.appendChild(document.createTextNode("\r\n"));
      rootNode.firstChild.appendChild(newLinkNode);
      rootNode.firstChild.appendChild(document.createTextNode("\r\n"));
    }

    var mainContent = this.doctypeToString(document.doctype) + this.surroundByTags(rootNode, rootNode.innerHTML);

    // Write main content to index file
    Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
       .getService(Components.interfaces.nsIScriptableUnicodeConverter)
       .charset = this.characterSet;
    mainContent = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                     .getService(Components.interfaces.nsIScriptableUnicodeConverter)
                     .ConvertFromUnicode(mainContent);

    MafUtils.createFile(indexFile.path, mainContent);

    if (mafCSScontent != "") {
      // Write CSS to css file

      Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        .getService(Components.interfaces.nsIScriptableUnicodeConverter)
        .charset = this.characterSet;
      mafCSScontent = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                         .getService(Components.interfaces.nsIScriptableUnicodeConverter)
                         .ConvertFromUnicode(mafCSScontent);

      MafUtils.createFile(MafUtils.appendToDir(dataPathFile.path, "mafindex.css"), mafCSScontent);
    }


    if (this.progressListener != null) {

      var timer = Components.classes["@mozilla.org/timer;1"]
                    .createInstance(Components.interfaces.nsITimer);
      this.timer = timer;
      var state = new saveTimerState();
      state.parent = this;
      timer.initWithCallback(state, 100, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

    }
  },


  surroundByTags: function(aNode, aContent) {
    var result = "<" + aNode.nodeName.toLowerCase();
    for (var i = 0; i < aNode.attributes.length; i++ ) {
      result += ' ' + aNode.attributes[i].name + '="' + aNode.attributes[i].value + '"';
    }
    result += ">\r\n";
    result = result + aContent + "</" + aNode.nodeName.toLowerCase() + ">\r\n";
    return result;
  },

  doctypeToString: function(aDoctype) {
    var result = "";
    if (aDoctype) {
      result = "<!DOCTYPE " + aDoctype.name;
      if (aDoctype.publicId) {
        result += ' PUBLIC "' + aDoctype.publicId + '"';
      }
      if (aDoctype.systemId) {
        result += ' "' + aDoctype.systemId + '"';
      }
      result += ">\r\n";
    }
    return result;
  },

  processDOMRecursively : function(rootNode, dataPathFile, dataPathStr)
  {
    for ( var curNode = rootNode.firstChild; curNode != null; curNode = curNode.nextSibling )
    {
      if ( curNode.nodeName == "#text" || curNode.nodeName == "#comment" ) continue;
      curNode = this.inspectNode(curNode, dataPathFile, dataPathStr);
      this.processDOMRecursively(curNode, dataPathFile, dataPathStr);
    }
  },


  inspectNode : function(aNode, dataPathFile, dataPathStr) {
    switch ( aNode.nodeName.toLowerCase() )
    {
      case "img" :
      case "embed" :
        var aFileName = this.saveURLtoFile(aNode.src);
        if (aFileName) aNode.setAttribute("src", aFileName);
        break;

      case "object" :
        var aFileName = this.saveURLtoFile(aNode.data);
        if (aFileName) aNode.setAttribute("data", aFileName);
        break;

      case "body" :
      case "table" :
      case "td" :
        var aFileName = this.saveURLtoFile(aNode.getAttribute("background"));
        if (aFileName) aNode.setAttribute("background", aFileName);
        break;

      case "input" :
        if ( aNode.type.toLowerCase() == "image" ) {
          var aFileName = this.saveURLtoFile(aNode.src);
          if (aFileName) aNode.setAttribute("src", aFileName);
        }
        break;

      case "link" :
        if ( aNode.rel.toLowerCase() == "stylesheet" ) {
          aNode = this.removeNodeFromParent(aNode);
          return aNode;
        } else if ( aNode.rel.toLowerCase() == "shortcut icon" ) {
          var aFileName = this.saveURLtoFile(aNode.href);
          if (aFileName) aNode.setAttribute("href", aFileName);
        } else {
          aNode.setAttribute("href", aNode.href);
        }
        break;

      case "base" :
      case "style" :
      case "script" :
      case "noscript" :
        aNode = this.removeNodeFromParent(aNode);
        return aNode;
        break;

      case "a" :
        aNode.setAttribute("href", this.resolveURL(this.baselocation, aNode.href));
        break;

      case "area" :
        if ( !aNode.hasAttribute("href") ) return aNode;
        /*
        var ext = this.splitFileName(this.getFileName(aNode.href))[1];
        var flag = false;
        switch ( ext.toLowerCase() ) {
          case "jpg" : case "jpeg" : case "png" : case "gif" :	flag = this.linked.img; break;
          case "mp3" : case "wav"  : case "ram" : 				flag = this.linked.snd; break;
          case "mpg" : case "mpeg" : case "avi" :
          case "ram" : case "rm"   : case "mov" : case "wmv" :	flag = this.linked.mov; break;
          case "zip" : case "lzh"  : case "rar" :					flag = this.linked.arc; break;
        }
        */
        //if ( flag || this.linked.all ) {
          var aFileName = this.saveURLtoFile(aNode.href);
          if (aFileName) aNode.setAttribute("href", aFileName);
        //} else {
        //  aNode.setAttribute("href", aNode.href);
        //}
        break;

      case "iframe" :
        aNode.setAttribute("src", aNode.src);
        break;

      case "frame":
        aNode = this.saveFrame(aNode);
        return aNode;
        break;

      case "form" :
        aNode.setAttribute("action", this.resolveURL(this.baselocation, aNode.action));
        break;
    }

    var newCSStext = this.inspectCSSText(aNode.style.cssText, this.baselocation);
    if ( newCSStext ) aNode.setAttribute("style", newCSStext);

    aNode.removeAttribute("onmouseover");
    aNode.removeAttribute("onmouseout");

    return aNode;
  },

  saveFrame: function(aNode) {
    var result = aNode;
    // Get the frame's filename

    // Resolve URL against the location href
    aURLString = this.resolveURL(this.baselocation, aNode.contentDocument.location.href);

    var aURL = Components.classes["@mozilla.org/network/standard-url;1"]
                  .createInstance(Components.interfaces.nsIURL);
    aURL.spec = aURLString;
    var newFileName = aURL.fileName;

    if ( !newFileName ) newFileName = "untitled";
    // Validate filename
    newFileName = this.validateFileName(newFileName);


    if ( this.fileList[newFileName] != undefined ) {
      if ( this.fileList[newFileName] != aURLString ) {
        var seq = 1;
        var fileLR = this.splitFileName(newFileName);
        while ( this.fileList[ fileLR[0] + "_" + this.leftZeroPad3(seq) + "." + fileLR[1] ] != undefined ) { seq++; }
        newFileName = fileLR[0] + "_" + this.leftZeroPad3(seq) + "." + fileLR[1];
      }
    }

    this.fileList[newFileName] = aURLString;

    var savedFrameFilename = MafUtils.appendToDir(this.dataPathFile.path, newFileName);

    var oFrameFile = Components.classes["@mozilla.org/file/local;1"]
                       .createInstance(Components.interfaces.nsILocalFile);
    oFrameFile.initWithPath(savedFrameFilename);


    // Create the local directory into which to save associated files.
    filesFolder = oFrameFile.clone();

    var nameWithoutExtension = filesFolder.leafName;
    nameWithoutExtension = nameWithoutExtension.substring(0, nameWithoutExtension.lastIndexOf("."));
    var filesFolderLeafName = nameWithoutExtension + "_files";

    filesFolder.leafName = filesFolderLeafName;

    var framePersist = new MafWebBrowserPersistClass();
    framePersist.saveDocument(result.contentDocument, oFrameFile, filesFolder, null, null, null);

    result.setAttribute("src", oFrameFile.leafName);

    return result;
  },

  getFileName : function(aURI)
  {
    var pos, Name;
    Name = ( (pos = aURI.indexOf("?")) != -1 ) ? aURI.substring(0, pos) : aURI;
    Name = ( (pos = Name.indexOf("#")) != -1 ) ? Name.substring(0, pos) : Name;
    Name = ( (pos = Name.lastIndexOf("/")) != -1 ) ? Name.substring(++pos) : Name;
    return Name;
  },

  splitFileName : function(aFileName) {
    var pos = aFileName.lastIndexOf(".");
    var ret = [];
    if ( pos != -1 ) {
      ret[0] = aFileName.substring(0, pos);
      ret[1] = aFileName.substring(pos + 1, aFileName.length);
    } else {
      ret[0] = aFileName;
      ret[1] = "dat";
    }
    return ret;
  },

  resolveURL : function(aBaseURL, aRelURL) {
    var aURL = Components.classes["@mozilla.org/network/standard-url;1"]
                   .createInstance(Components.interfaces.nsIURI);
    aURL.spec = aBaseURL;
    return aURL.resolve(aRelURL);
  },

  validateFileName : function(aFileName) {
    aFileName = aFileName.replace(/[\"]+/g, "'");
    aFileName = aFileName.replace(/[\*\:\?]+/g, "-");
    aFileName = aFileName.replace(/[\<]+/g, "(");
    aFileName = aFileName.replace(/[\>]+/g, ")");
    aFileName = aFileName.replace(/[\\\/\|]+/g, "_");
    aFileName = aFileName.replace(/[\s]+/g, "_");
    aFileName = aFileName.replace(/[%]+/g, "@");
    return aFileName;
  },

  getCacheEntry: function(url) {
    var result = null;

    try {
      var cacheService = Components.classes["@mozilla.org/network/cache-service;1"]
                            .getService(Components.interfaces.nsICacheService);
      var httpCacheSession = cacheService.createSession("HTTP", Components.interfaces.nsICache.STORE_ANYWHERE, true);
      httpCacheSession.doomEntriesIfExpired = false;

      var cacheEntryDescriptor = httpCacheSession.openCacheEntry(url, Components.interfaces.nsICache.ACCESS_READ, false);
      if (cacheEntryDescriptor) {
        result = cacheEntryDescriptor;
      }
    } catch(e) {
      result = null;
    }
    return result;
  },

  getSizeOfCacheEntry: function(cacheEntry) {
    var result = 0;

    return result;
  },


  saveURLtoFile : function(aURLString) {
    if ( !aURLString ) return;

    // Resolve URL against the location href
    aURLString = this.resolveURL(this.baselocation, aURLString);

    var aURL = Components.classes["@mozilla.org/network/standard-url;1"]
                  .createInstance(Components.interfaces.nsIURL);
    aURL.spec = aURLString;
    var newFileName = aURL.fileName;

    if ( !newFileName ) newFileName = "untitled";
    // Validate filename
    newFileName = this.validateFileName(newFileName);

    if ( this.fileList[newFileName] == undefined )
    {

    }
    else if ( this.fileList[newFileName] != aURLString )
    {
      var seq = 1;
      var fileLR = this.splitFileName(newFileName);
      while ( this.fileList[ fileLR[0] + "_" + this.leftZeroPad3(seq) + "." + fileLR[1] ] != undefined ) { seq++; }
      newFileName = fileLR[0] + "_" + this.leftZeroPad3(seq) + "." + fileLR[1];
    }
    else
    {
      return this.dataPathStr + newFileName;
    }

    if ( !aURL.schemeIs("file") ) {
      // Is it cached?
      var cacheEntry = this.getCacheEntry(aURL.spec);

      if (cacheEntry != null) {
        try {
          var haveAFile = false;

          try {
            if (cacheEntry.file != null) {
              haveAFile = true;
            }
          } catch (ex) {

          }

          if (haveAFile) {
            // TODO: Copy file?

          } else { // Read from stream
            var cacheItemInputStream = cacheEntry.openInputStream(0);

            var obj_BinaryI = Components.classes["@mozilla.org/binaryinputstream;1"]
                                  .createInstance(Components.interfaces.nsIBinaryInputStream);

            obj_BinaryI.setInputStream(cacheItemInputStream);

            var contents = obj_BinaryI.readByteArray(obj_BinaryI.available());

            obj_BinaryI.close();

            // Write to target
            var targetFile = this.dataPathFile.clone();
            targetFile.append(newFileName);

            if (!targetFile.exists()) {
              targetFile.create(0x00, 0644);
            }

            var oTransport = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                .createInstance(Components.interfaces.nsIFileOutputStream);
            oTransport.init( targetFile, 0x04 | 0x08 | 0x10, 064, 0 );

            var obj_BinaryO = Components.classes["@mozilla.org/binaryoutputstream;1"]
                                .createInstance(Components.interfaces.nsIBinaryOutputStream);
            obj_BinaryO.setOutputStream(oTransport);

            obj_BinaryO.writeByteArray(contents, contents.length);
            oTransport.close();

            return this.dataPathStr + newFileName;
          }
        } catch (e) {
          mafdebug(e);
        }

      } else {
        try {
          var targetFile = this.dataPathFile.clone();
          targetFile.append(newFileName);

          var WBP = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                      .createInstance(Components.interfaces.nsIWebBrowserPersist);
          this.request++;
          var progressListenerHandler = {
            onStateChange : function()
            {
              if ( WBP.currentState == WBP.PERSIST_STATE_FINISHED )
              {
                this.parent.request--;
              }
            },
            onProgressChange : function() {},
            onStatusChange   : function() {},
            onLocationChange : function() {},
            onSecurityChange : function() {}
          };
          progressListenerHandler.parent = this;
          WBP.progressListener = progressListenerHandler;
          WBP.saveURI(aURL, null, this.referrer, null, null, targetFile);
          this.fileList[newFileName] = aURLString;
          return this.dataPathStr + newFileName;
        }
        catch(err)
        {
          mafdebug(err);
          this.request--;
          return aURL.spec;
        }
      }
   } else {
    try {
      var targetDir = this.dataPathFile.clone();
      var orgFile = this.convertURLToFile(aURLString);
      if ( !orgFile.isFile() ) return;
      orgFile.copyTo(targetDir, newFileName);
      this.fileList[newFileName] = aURLString;
      return this.dataPathStr + newFileName;
    } catch(err)  {
      mafdebug(err);
      return "";
    }
   }
  },

  removeNodeFromParent : function(aNode) {
    var newNode = this.document.createTextNode("");
    aNode.parentNode.replaceChild(newNode, aNode);
    aNode = newNode;
    return aNode;
  },

  leftZeroPad3 : function(num)
  {
    if ( num < 10 ) {
      return "00" + num;
    } else if ( num < 100 ) {
      return "0" + num;
    } else {
      return num;
    }
  },


  processCSSRecursively : function(aCSS)
  {
    var content = "";

    if ( aCSS.disabled ) return "";
    var medium = aCSS.media.mediaText;
    if ( !medium.match("screen|all", "i") && medium != "" ) {
      return "";
    }

    var flag = false;
    for ( var i = 0; i < aCSS.cssRules.length; i++ ) {
      if ( aCSS.cssRules[i].type == 1 ) {
        if ( !flag ) { content += "\r\n/* ::::: " + aCSS.href + " ::::: */\r\n\r\n"; flag = true; }
        content += this.inspectCSSText(aCSS.cssRules[i].cssText, aCSS.href) + "\n";
      } else if ( aCSS.cssRules[i].type == 3 ) {
        content += this.processCSSRecursively(aCSS.cssRules[i].styleSheet);
      }
    }
    return content;
  },

  saveURI: function(URI, cacheKey, referrer, postData, extraHeaders, file) {
    var WBP = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                 .createInstance(Components.interfaces.nsIWebBrowserPersist);
    WBP.progressListener = this.progressListener;
    WBP.saveURI(URI, cacheKey, referrer, postData, extraHeaders, file);
    this.currentState = WBP.currentState;
    this.result = WBP.result;
  },

  convertURLToFile : function(aURLString) {

    var aURL = Components.classes["@mozilla.org/network/standard-url;1"]
                  .createInstance(Components.interfaces.nsIURI);
    aURL.spec = aURLString;

    if ( !aURL.schemeIs("file") ) return;
    try {
      var fileHandler = Components.classes["@mozilla.org/network/io-service;1"]
                           .getService(Components.interfaces.nsIIOService)
                           .getProtocolHandler("file")
                           .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
      return fileHandler.getFileFromURLSpec(aURLString);
    } catch(ex) {
      return null;
    }
  },


  inspectCSSText : function(aCSStext, aCSShref)
  {
    if ( !aCSStext ) return;
    var RE = new RegExp(/ url\(([^\'\)]+)\)/);
    var i = 0;
    while ( aCSStext.match(RE) )
    {
      if ( ++i > 10 ) break;
      var imgURL  = this.resolveURL(aCSShref, RegExp.$1);
      var imgFile = this.saveURLtoFile(imgURL);

      if (this.dataPathStr.length > 0) {
        // Since the css is in the same folder as the other data
        if (imgFile.startsWith(this.dataPathStr)) {
          imgFile = imgFile.substring(this.dataPathStr.length, imgFile.length);
        }
      }
      aCSStext = aCSStext.replace(RE, " url('" + imgFile + "')");
    }
    aCSStext = aCSStext.replace(/\r|\n/g, "\\A");
    RE = new RegExp(/ content: [\"\'](.*?)[\"\']; /);
    if ( aCSStext.match(RE) )
    {
      var innerQuote = RegExp.$1;
      innerQuote = innerQuote.replace(/\"/g, '\\"');
      innerQuote = innerQuote.replace(/\\[\"\'] attr\(([^\)]+)\) \\[\"\']/g, '" attr($1) "');
      aCSStext = aCSStext.replace(RE, ' content: "' + innerQuote + '"; ');
    }
    aCSStext = aCSStext.replace(/ quotes: [^;]+; /g, " ");
    if ( aCSStext.match(/ background: /i) )
    {
      aCSStext = aCSStext.replace(/ -moz-background-[^:]+: initial;/g, "");
      aCSStext = aCSStext.replace(/ scroll 0%/, "");
    }
    return aCSStext;
    /* " */
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsIWebBrowserPersist) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};

function saveTimerState() {

};

saveTimerState.prototype = {

  notify: function(expiredtimer) {
    const nsIWPL = Components.interfaces.nsIWebProgressListener;
    const nsIWBP = mafWebBrowserPersistIID;

    if (this.parent.request <= 0) {

      if (this.parent.progressListener != null) {
        this.parent.progressListener.onProgressChange(null, null, 100, 100, 100, 100);
        this.parent.currentState = nsIWBP.PERSIST_STATE_FINISHED;
        this.parent.progressListener.onStateChange(null, null, nsIWPL.STATE_IS_NETWORK | nsIWPL.STATE_STOP, null);
      }
      this.parent.timer.cancel();

    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsITimerCallback) &&
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

String.prototype.startsWith = function(needle) {
  return (this.substring(0, needle.length) == needle);
};

var MAFWebBrowserPersistFactory = new Object();

MAFWebBrowserPersistFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafWebBrowserPersistIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
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

  return (new MafWebBrowserPersistClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFWebBrowserPersistModule = new Object();

MAFWebBrowserPersistModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafWebBrowserPersistCID,
                                  "Maf WebBrowser Persist JS Component",
                                  mafWebBrowserPersistContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFWebBrowserPersistModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafWebBrowserPersistCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFWebBrowserPersistFactory;
};

MAFWebBrowserPersistModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFWebBrowserPersistModule;
};

