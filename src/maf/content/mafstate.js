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
 * Holds the state of the MAF archives, the meta-data for each open archive.
 * This is a local object, so for each window this is created.
 * A global object stored in a hidden window holds the real state.
 * If that is null, that state is saved using this object.
 * If it is not null, this object is ignored.
 */
var MafState = {

  /** A list of open archives. */
  openArchives: new Array(),

  /** A count of the number of open archives. */
  noOfArchives: 0,

  /** A list of local file urls and the network url it maps to */
  localFileToUrlMap: new Array(),

  /** A list of network urls and the local file url it maps to */
  urlToLocalFileMap: new Array(),

  /**
   * Add archive file info to the state.
   */
  addArchiveInfo: function(tempPath, foldernum, archivePath) {
    this.noOfArchives++;

    var archiveRootSubjectStr = "http://maf.mozdev.org/metadata/rdf/archive/" + this.noOfArchives + "/";

    archive1Subject = gRDFService.GetResource(archiveRootSubjectStr);
    archive1Sequence = gRDFCService.MakeSeq(this.datasource, archive1Subject);

    var localUrls = this.addArchivePagesToDatasource(tempPath, foldernum, archiveRootSubjectStr, archive1Sequence);

    var archiveRootSubject = gRDFService.GetResource(archiveRootSubjectStr);
    var archivePredicate = gRDFService.GetResource(MAFNamespace + "title");
    var archiveObject = gRDFService.GetResource("Archive " + this.noOfArchives);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    archivePredicate = gRDFService.GetResource(MAFNamespace + "localurl");
    archiveObject = gRDFService.GetResource(archivePath);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    this.archivesSequence.AppendElement(archive1Subject);

    return localUrls;
  },

  /**
   * For each saved page, there's an RDF file, process it to get the information.
   * Processing is split up into three loops because on windows local files initWithPath
   * causes something to freak out and stop working. Works fine as one loop in Linux.
   */
  addArchivePagesToDatasource: function(temp, expandedArchiveRoot, archiveSubjectRoot, archiveSequence) {
    try {

    var localUrls = new Array();

    var pageNo = 1;

    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(MafUtils.appendToDir(temp, expandedArchiveRoot));

    if (oDir.exists() && oDir.isDirectory()) {
      var entries = oDir.directoryEntries;

      var dirList = new Array();

      // For each folder in the expanded archive root
      while (entries.hasMoreElements()) {

        var currDir = entries.getNext();
        currDir.QueryInterface(localFileIID);

        if (currDir.isDirectory()) {
          var currArchivePath = MafUtils.getURI(currDir.nsIFile);

          dirList[dirList.length] = [currArchivePath, currDir.path]

        }
      }


      var indexList = new Array();

      for (var i=0; i<dirList.length; i++) {

          var indexrdffile = Components.classes[localFileContractID].getService(localFileIID);
          indexrdffile.initWithPath(dirList[i][1]);
          indexrdffile.append("index.rdf");

          var title = "Page " + pageNo;
          var originalurl = "Unknown";
          var archivetime = "Unknown";
          var indexfilename = "index.html";

            // If the metadata exists
            if (indexrdffile.exists()) {
              // Update the variables with the actual metadata info
              var rdfdataresult = this.getMetaDataFrom(indexrdffile, dirList[i][0]);
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


         indexList[indexList.length] = [title, originalurl, archivetime, indexfilename];
      }


      for (var i=0; i<dirList.length; i++) {
          var indexhtmlfile = Components.classes[localFileContractID].getService(localFileIID);
          indexhtmlfile.initWithPath(dirList[i][1]);
          indexhtmlfile.append(indexList[i][3]);

          var thisPageRDFSubjectRoot = archiveSubjectRoot + "" + (i+1) + "/";

          // get file URL - temp + expandedArchiveRoot + currFolder + index.html
          var localurl = MafUtils.getURI(indexhtmlfile.nsIFile);

          localUrls[localUrls.length] = localurl;

          this.addPageInfoToMetaData(thisPageRDFSubjectRoot, indexList[i][0], indexList[i][1], indexList[i][2], localurl, archiveSequence);
      }

    }

    } catch(e) {
      alert(e);
    }

    return localUrls;
  },

  /**
   * Asserts the RDF info.
   */
  addPageInfoToMetaData: function(thisPageRDFSubjectRoot, title, originalurl, archivetime, localurl, archiveSequence) {
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
      mdatasource = Components.classes[xmlRDFDatasourceContractID].createInstance(xmlRDFDatasourceIID);
      mdatasource.Init(MafUtils.getURI(sourcefile.nsIFile));
      mdatasource.Refresh(true);
      mdatasource.QueryInterface(rdfDatasourceIID);
    } catch(e) {
      mdatasource = gRDFService.GetDataSource(MafUtils.getURI(sourcefile.nsIFile));
    }


    try {
      // This archive's unique archive URL resource
      var rootSubject = gRDFService.GetResource("urn:root");

      // Get the title
      var predicate = gRDFService.GetResource(MAFNamespace + "title");

      var titletarget = mdatasource.GetTarget(rootSubject, predicate, true);
      titletarget = titletarget.QueryInterface(rdfResourceIID);
      result["title"] = titletarget.Value;
      if (resourcePath.length < result["title"].length) {
        // If the resource is in the result, remove it
        if (result["title"].substring(0, resourcePath.length) == resourcePath) {
          result["title"] = result["title"].substring(resourcePath.length, result["title"].length);
        }
      }

      // Get the original url
      predicate = gRDFService.GetResource(MAFNamespace + "originalurl");

      var originalurltarget = mdatasource.GetTarget(rootSubject, predicate, true);
      originalurltarget = originalurltarget.QueryInterface(rdfResourceIID);
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
      archivetimetarget = archivetimetarget.QueryInterface(rdfResourceIID);
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
      indexfilenametarget = indexfilenametarget.QueryInterface(rdfResourceIID);
      result["indexfilename"] = indexfilenametarget.Value;
      if (resourcePath.length < result["indexfilename"].length) {
        // If the resource is in the result, remove it
        if (result["indexfilename"].substring(0, resourcePath.length) == resourcePath) {
          result["indexfilename"] = result["indexfilename"].substring(resourcePath.length, result["indexfilename"].length);
        }
      }

    } catch (e) {

    }

    return result;
  },


  /**
   * Creates an in memory RDF data source
   */
  setupDataSource: function() {
    var ds = Components.classes[rdfDatasourceInMemoryContractID].createInstance();
    this.datasource = ds.QueryInterface(rdfDatasourceIID);

    var rootArchiveSubject = gRDFService.GetResource("http://maf.mozdev.org/metadata/rdf/open-archives");
    this.archivesSequence = gRDFCService.MakeSeq(this.datasource, rootArchiveSubject);

  }


};


/**
 * Helper function that lets one see the source to in memory rdf data sources
 */
function serialize(originalDatasource){
  var ser = Components.classes[rdfXMLSerializerContractID].getService(rdfXMLSerializerIID);

  ser.QueryInterface(rdfXMLSourceIID);

  var outputstream = {
    content:"",
    write:function(s, count) {
      this.content+=s;
      return count;
    },
    flush:function(){},
    close:function(){}
  };

  ser.init(originalDatasource);
  ser.Serialize(outputstream);
  alert(outputstream.content);
};

