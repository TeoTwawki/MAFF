/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.6.2
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

// Provides MAF State service

const mafStateContractID = "@mozilla.org/maf/state_service;1";
const mafStateCID = Components.ID("{de7a59d9-4857-4a8e-9455-61e1c990d6ea}");
const mafStateIID = Components.interfaces.nsIMafState;

const MAFNamespaceId = "MAF";
const MAFNamespace = "http://maf.mozdev.org/metadata/rdf#";


var gRDFService = null;
var gRDFCService = null;
var MafStateService = null;
var MafUtils = null;
var MafPreferences = null;
var MafLibMHTDecoder = null;

var MafStrBundle = null;

var gNETIOService = null;



/**
 * The MAF State Service.
 */
function MafStateServiceClass() {
  // Create an in memory RDF data source
  this.datasource = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
                       .createInstance(Components.interfaces.nsIRDFDataSource);

  var rootArchiveSubject = gRDFService.GetResource("http://maf.mozdev.org/metadata/rdf/open-archives");
  this.archivesSequence = gRDFCService.MakeSeq(this.datasource, rootArchiveSubject);
}

MafStateServiceClass.prototype = {
  /** A list of open archives. */
  openArchives: new Array(),

  /** A count of the number of open archives. */
  noOfArchives: 0,

  /** A list of local file urls and the network url it maps to */
  localFileToUrlMap: new Array(),

  /** A list of network urls and the local file url it maps to */
  urlToLocalFileMap: new Array(),

  /** A list of local file urls and the maf url it maps to */
  localFileToMafUrlMap: new Array(),

  /**
   * Add archive file info to the state.
   */
  addArchiveInfo: function(tempPath, foldernum, archivePath, count, localUrls) {
    this.openArchives[MafUtils.getURIFromFilename(archivePath)] = MafUtils.appendToDir(tempPath, foldernum);

    this.noOfArchives++;

    var archiveRootSubjectStr = "http://maf.mozdev.org/metadata/rdf/archive/" + this.noOfArchives + "/";

    archive1Subject = gRDFService.GetResource(archiveRootSubjectStr);
    archive1Sequence = gRDFCService.MakeSeq(this.datasource, archive1Subject);

    localUrls.value = this._addArchivePagesToDatasource(tempPath, foldernum, archiveRootSubjectStr, archive1Sequence,
                                                         MafUtils.getURIFromFilename(archivePath));
    count.value = localUrls.value.length;

    var archiveRootSubject = gRDFService.GetResource(archiveRootSubjectStr);
    var archivePredicate = gRDFService.GetResource(MAFNamespace + "title");
    var archiveObject = gRDFService.GetResource(MafStrBundle.GetStringFromName("archive") + " " + this.noOfArchives);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    archivePredicate = gRDFService.GetResource(MAFNamespace + "localurl");
    archiveObject = gRDFService.GetResource(archivePath);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    this.archivesSequence.AppendElement(archive1Subject);
  },


  isArchiveURIOpen: function(uri) {
    return (typeof(this.openArchives[uri]) != "undefined");
  },

  expandedArchiveURIPath: function(uri) {
    return this.openArchives[uri];
  },

  getDatasource: function() {
    return this.datasource;
  },

  /**
   * For each saved page, there's an RDF file, process it to get the information.
   */
  _addArchivePagesToDatasource: function(temp, expandedArchiveRoot, archiveSubjectRoot, archiveSequence, archiveUri) {
    try {

      var localUrls = new Array();

      var pageNo = 1;

      var oDir = Components.classes["@mozilla.org/file/local;1"]
                     .createInstance(Components.interfaces.nsILocalFile);
      oDir.initWithPath(MafUtils.appendToDir(temp, expandedArchiveRoot));

      var isMHTArchive = (MafLibMHTDecoder.PROGID == MafPreferences.programFromOpenIndex(
                         MafPreferences.getOpenFilterIndexFromFilename(archiveUri)));

      if (oDir.exists() && oDir.isDirectory()) {
        var entries = oDir.directoryEntries;

        var dirList = new Array();

        // For each folder in the expanded archive root
        while (entries.hasMoreElements()) {

          var currDir = entries.getNext();
          currDir.QueryInterface(Components.interfaces.nsILocalFile);

          if (currDir.isDirectory()) {
            pageNo++;
            var currArchivePath = MafUtils.getURI(currDir.nsIFile);

            dirList[dirList.length] = [currArchivePath, currDir.path]

            var indexrdffile = Components.classes["@mozilla.org/file/local;1"]
                                  .createInstance(Components.interfaces.nsILocalFile);
            indexrdffile.initWithPath(currDir.path);
            indexrdffile.append("index.rdf");

            var title = "Page " + pageNo;
            var originalurl = "Unknown";
            var archivetime = "Unknown";
            var indexfilename = "index.html";

            // If the metadata exists
            if (indexrdffile.exists()) {
              // Update the variables with the actual metadata info
              var rdfdataresult = this.getMetaDataFrom(indexrdffile, currArchivePath);
              if (rdfdataresult["title"] != "") {
                title = rdfdataresult["title"];
              }
              if (rdfdataresult["originalurl"] != "") {
                originalurl = rdfdataresult["originalurl"];
              }
              if (rdfdataresult["archivetime"] != "") {
                archivetime = rdfdataresult["archivetime"];
              }
              if (rdfdataresult["indexfilename"] != "") {
                indexfilename = rdfdataresult["indexfilename"];
              }
            }

            // If not mht
            if (!isMHTArchive) {
              var archiveFilePart = currDir.leafName + "/" + indexfilename;
            } else {
              var archiveFilePart = "/" + indexfilename;
            }

            var indexhtmlfile = Components.classes["@mozilla.org/file/local;1"]
                                  .createInstance(Components.interfaces.nsILocalFile);
            indexhtmlfile.initWithPath(currDir.path);
            indexhtmlfile.append(indexfilename);

            var thisPageRDFSubjectRoot = archiveSubjectRoot + "" + pageNo + "/";

            // get file URL - temp + expandedArchiveRoot + currFolder + index.html
            var localurl = MafUtils.getURI(indexhtmlfile.nsIFile);

            localUrls[localUrls.length] = localurl;

            this.addPageInfoToMetaData(thisPageRDFSubjectRoot, title, originalurl, archivetime, localurl, archiveSequence,
                                        archiveUri, archiveFilePart);
          }
        }
      }
    } catch(e) {
      mafdebug(e);
    }

    return localUrls;
  },

  /**
   * Asserts the RDF info.
   */
  addPageInfoToMetaData: function(thisPageRDFSubjectRoot, title, originalurl, archivetime, localurl, archiveSequence,
                                   archiveUri, archiveFilePart) {
    // Add the page info to the metadata

    // This archive's unique archive URL resource
    var rootSubject = gRDFService.GetResource(thisPageRDFSubjectRoot);

    // Add the title
    var predicate = gRDFService.GetResource(MAFNamespace + "title");
    var object = gRDFService.GetResource(title);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the original url
    predicate = gRDFService.GetResource(MAFNamespace + "originalurl");
    object = gRDFService.GetResource(originalurl);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the archive time
    predicate = gRDFService.GetResource(MAFNamespace + "archivetime");
    object = gRDFService.GetResource(archivetime);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the local url
    predicate = gRDFService.GetResource(MAFNamespace + "localurl");
    object = gRDFService.GetResource(localurl);
    this.datasource.Assert(rootSubject, predicate, object, true);

    archiveSequence.AppendElement(rootSubject);

    // Add the info to a searchable URL map.
    this.localFileToUrlMap[localurl] = originalurl;
    this.urlToLocalFileMap[originalurl] = localurl;

    // Add maf protocol support
    this.localFileToUrlMap["maf://" + archiveUri + "!" + archiveFilePart] = originalurl
    this.localFileToMafUrlMap[localurl] = "maf://" + archiveUri + "!" + archiveFilePart;

    // If the original url has a # sign, add the original url without the # sign to the list
    if (originalurl.indexOf("#") > 0) {
      this.urlToLocalFileMap[originalurl.substring(0,originalurl.indexOf("#"))] = localurl;
    }
  },

  /**
   * Tries to read the data from the RDF for a specific file.
   */
  getMetaDataFrom: function(sourcefile, resourcePath) {
    var result = new Array();
    result["title"] = "Unknown";
    result["originalurl"] = "Unknown";
    result["archivetime"] = "Unknown";
    result["indexfilename"] = "index.html";


    var mdatasource;
    // If loading the data source is a problem, we've probably loaded it already
    try {
      mdatasource = Components.classes["@mozilla.org/rdf/datasource;1?name=xml-datasource"]
                       .createInstance(Components.interfaces.nsIRDFRemoteDataSource);
      mdatasource.Init(MafUtils.getURI(sourcefile.nsIFile));
      mdatasource.Refresh(true);
      mdatasource.QueryInterface(Components.interfaces.nsIRDFDataSource);
    } catch(e) {
      mdatasource = gRDFService.GetDataSource(MafUtils.getURI(sourcefile.nsIFile));
    }


    try {
      // This archive's unique archive URL resource
      var rootSubject = gRDFService.GetResource("urn:root");

      // Get the title
      var predicate = gRDFService.GetResource(MAFNamespace + "title");

      var titletarget = mdatasource.GetTarget(rootSubject, predicate, true);
      titletarget = titletarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result["title"] = titletarget.Value;
      if (resourcePath.length < result["title"].length) {
        // If the resource is in the result, remove it
        if (result["title"].substring(0, resourcePath.length) == resourcePath) {
          result["title"] = result["title"].substring(resourcePath.length, result["title"].length);
        }
      }

      // Convert the title to unicode
      // Bug ref#: 8897
      var oConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                        .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      oConverter.charset = "UTF-8";
      result["title"] = oConverter.ConvertToUnicode(result["title"]);

      // Get the original url
      predicate = gRDFService.GetResource(MAFNamespace + "originalurl");

      var originalurltarget = mdatasource.GetTarget(rootSubject, predicate, true);
      originalurltarget = originalurltarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result["originalurl"] = originalurltarget.Value;
      if (resourcePath.length < result["originalurl"].length) {
        // If the resource is in the result, remove it
        if (result["originalurl"].substring(0, resourcePath.length) == resourcePath) {
          result["originalurl"] = result["originalurl"].substring(resourcePath.length, result["originalurl"].length);
        }
      }

      // Get the archive time
      predicate = gRDFService.GetResource(MAFNamespace + "archivetime");

      var archivetimetarget = mdatasource.GetTarget(rootSubject, predicate, true);
      archivetimetarget = archivetimetarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result["archivetime"] = archivetimetarget.Value;
      if (resourcePath.length < result["archivetime"].length) {
        // If the resource is in the result, remove it
        if (result["archivetime"].substring(0, resourcePath.length) == resourcePath) {
          result["archivetime"] = result["archivetime"].substring(resourcePath.length, result["archivetime"].length);
        }
      }

      // Get the index file name
      predicate = gRDFService.GetResource(MAFNamespace + "indexfilename");

      var indexfilenametarget = mdatasource.GetTarget(rootSubject, predicate, true);
      indexfilenametarget = indexfilenametarget.QueryInterface(Components.interfaces.nsIRDFResource);
      result["indexfilename"] = indexfilenametarget.Value;
      if (resourcePath.length < result["indexfilename"].length) {
        // If the resource is in the result, remove it
        if (result["indexfilename"].substring(0, resourcePath.length) == resourcePath) {
          result["indexfilename"] = result["indexfilename"].substring(resourcePath.length, result["indexfilename"].length);
        }
      }

    } catch (e) {
      mafdebug(e);
    }

    return result;
  },

  isArchiveURL: function(url) {
    var result = false;

    if (typeof(this.localFileToUrlMap[url]) != "undefined") {
      result = true;
    }

    if (!result) {

      // Could be a document in a frame
      try {
        // Try to get the file object's parent
        var ouri = gNETIOService.newURI(url, "", null);    // Create URI object
        var parent = ouri.QueryInterface(Components.interfaces.nsIFileURL).file.parent;

        while ((parent != null) && (!result)) {
          // If the parent index.htm or index.html is in the map, it's an archive url
          var uri1 = MafUtils.getURIFromFilename(MafUtils.appendToDir(parent.path, "index.html"));
          var uri2 = MafUtils.getURIFromFilename(MafUtils.appendToDir(parent.path, "index.htm"));
          if ((typeof(this.localFileToUrlMap[uri1]) != "undefined") ||
              (typeof(this.localFileToUrlMap[uri2]) != "undefined")) {
            result = true;
          }

          parent = parent.parent;
        }

      } catch(e) {
        // For URIs that are not files, exceptions are ignored.

      }
    }

    return result;
  },

  isLocallyMappableURL: function(url) {
    var result = false;

    if (typeof(this.urlToLocalFileMap[url]) != "undefined") {
      result = true;
    }
    return result;
  },

  getLocalURL: function(url) {
    var result = url;

    if (typeof(this.urlToLocalFileMap[url]) != "undefined") {
      result = this.urlToLocalFileMap[url];
    }
    return result;
  },

  getOriginalURL: function(url) {
    var result = url;

    if (typeof(this.localFileToUrlMap[url]) != "undefined") {
      result = this.localFileToUrlMap[url];
    }
    return result;
  },

  getMafURL: function(url) {
    var result = url;

    if (typeof(this.localFileToMafUrlMap[url]) != "undefined") {
      result = this.localFileToMafUrlMap[url];
    }
    return result;
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafStateIID) &&
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


var MafStateFactory = new Object();

MafStateFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafStateIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (gRDFService == null) {
    gRDFService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                     .getService(Components.interfaces.nsIRDFService);
  }

  if (gRDFCService == null) {
    gRDFCService = Components.classes["@mozilla.org/rdf/container-utils;1"]
                     .getService(Components.interfaces.nsIRDFContainerUtils);
  }

  if (gNETIOService == null) {
    gNETIOService = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  if (MafPreferences == null) {
    MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                        .getService(Components.interfaces.nsIMafPreferences);
  }

  if (MafLibMHTDecoder == null) {
    MafLibMHTDecoder = Components.classes["@mozilla.org/libmaf/decoder;1?name=mht"]
                          .createInstance(Components.interfaces.nsIMafMhtDecoder);
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }

  if (MafStateService == null) {
    MafStateService = new MafStateServiceClass();
  }

  return MafStateService.QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MafStateModule = new Object();

MafStateModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafStateCID,
                                  "Maf State JS Component",
                                  mafStateContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MafStateModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafStateCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MafStateFactory;
};

MafStateModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MafStateModule;
};

