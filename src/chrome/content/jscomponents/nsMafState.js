/**
 * Mozilla Archive Format
 * ======================
 *
 *  Copyright (c) 2005 Christopher Ottley.
 *  Portions Copyright (c) 2008 Paolo Amadini.
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

var MAFNamespace = "http://maf.mozdev.org/metadata/rdf#";

var gRDFService = null;
var gRDFCService = null;
var gNETIOService = null;


function GetMafStateServiceClass() {
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

  if (!sharedData.MafStateService) {
    sharedData.MafStateService = new MafStateServiceClass();
  }

  return sharedData.MafStateService;
}

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
  addArchiveInfo: function(archive, count, localUrls) {
    this.noOfArchives++;

    var archiveRootSubjectStr = "http://maf.mozdev.org/metadata/rdf/archive/" + this.noOfArchives + "/";

    archive1Subject = gRDFService.GetResource(archiveRootSubjectStr);
    archive1Sequence = gRDFCService.MakeSeq(this.datasource, archive1Subject);

    localUrls.value = this._addArchivePagesToDatasource(archiveRootSubjectStr, archive1Sequence,
                                                         MafUtils.getURIFromFilename(archive.file.path), archive);
    count.value = localUrls.value.length;

    var archiveRootSubject = gRDFService.GetResource(archiveRootSubjectStr);
    var archivePredicate = gRDFService.GetResource(MAFNamespace + "title");
    var archiveObject = gRDFService.GetResource(MafStrBundle.GetStringFromName("archive") + " " + this.noOfArchives);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    archivePredicate = gRDFService.GetResource(MAFNamespace + "localurl");
    archiveObject = gRDFService.GetResource(archive.file.path);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    this.archivesSequence.AppendElement(archive1Subject);
  },

  getDatasource: function() {
    return this.datasource;
  },

  /**
   * For each saved page, there's an RDF file, process it to get the information.
   */
  _addArchivePagesToDatasource: function(archiveSubjectRoot, archiveSequence, archiveUri, archive) {
    var localUrls = new Array();
    // For each folder in the expanded archive root
    archive.pages.forEach(function(page, pageIndex) {
      if (archive.type != "TypeMHTML") {
        try {
          page._loadMetadata();
        } catch (e) {
          Cu.reportError(e);
        }
      }

      var title = page.title || ("Page " + (pageIndex + 1));
      var originalurl = page.originalUrl || "Unknown";
      var archivetime = page.dateArchived || "Unknown";
      var indexfilename = page.indexLeafName || "index.html";

      var archiveFilePart = page.tempDir.leafName + "/" + indexfilename;

      var indexhtmlfile = page.tempDir.clone();
      indexhtmlfile.append(indexfilename);

      var thisPageRDFSubjectRoot = archiveSubjectRoot + "" + (pageIndex + 1) + "/";

      // get file URL - temp + expandedArchiveRoot + currFolder + index.html
      var localurl = MafUtils.getURI(indexhtmlfile.nsIFile);

      localUrls[localUrls.length] = localurl;

      this.addPageInfoToMetaData(thisPageRDFSubjectRoot, title, originalurl, archivetime, localurl, archiveSequence,
                                  archiveUri, archiveFilePart);
    }, this);
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
    this.localFileToUrlMap["jar:" + archiveUri + "!/" + archiveFilePart] = originalurl
    this.localFileToMafUrlMap[localurl] = "jar:" + archiveUri + "!/" + archiveFilePart;

    // If the original url has a # sign, add the original url without the # sign to the list
    if (originalurl.indexOf("#") > 0) {
      this.urlToLocalFileMap[originalurl.substring(0,originalurl.indexOf("#"))] = localurl;
    }
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
  }
};