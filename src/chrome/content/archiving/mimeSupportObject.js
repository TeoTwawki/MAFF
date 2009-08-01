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
 * The MimeSupport global object provides helper functions for handling various
 *  MIME-related tasks.
 */
var MimeSupport = {

  // --- Public methods and properties ---

  /**
   * Returns the given string of bytes encoded to "Quoted-Printable". For more
   *  information on the "Quoted-Printable" encoding specification, see
   *  <http://tools.ietf.org/html/rfc1521#section-5.1> (retrieved 2008-05-14).
   *
   * @param aOctets   String containing the octets to be encoded. Every single
   *                   character in this string must have a character code
   *                   between 0 and 255.
   */
  encodeQuotedPrintable: function(aOctets) {
    // Encode the mandatory characters. Octets with decimal values of 33 through
    //  60, inclusive, and 62 through 126, inclusive, are not encoded. Spaces,
    //  tabs, and line breaks will be encoded or normalized later, if necessary.
    var aEncodedLines = aOctets.replace(
      /[^\t\r\n \x21-\x3C\x3E-\x7E]/g,
      function (aMatch) {
        // Convert the octet to hexadecimal representation
        var hexString = "0" + aMatch.charCodeAt(0).toString(16).toUpperCase();
        // Consider only the last two digits of the number
        return "=" + hexString.slice(-2);
      }
    );

    // Limit the final line length to 76 characters, adding soft line breaks if
    //  necessary. Also convert every type of line break to CRLF. Since the
    //  regular expression used for the task cannot handle strings that don't
    //  end with a line break, add one now and remove it at the end.
    return (aEncodedLines + "\r\n").replace(
      /*
       * The regular expression below is composed of the following parts:
       *
       * aMain   ( [^\r\n]{0,73} )
       *
       * The first 73 characters of each line, up to and excluding the end of
       *  line character, if present.
       *
       * aLastThree   ( =.. or [ \t] or [^\r\n=]{2}[^\t\r\n =] )
       *
       * This group will match only if followed by a line ending. Can be an
       *  encoded octet representation, a space or tab (that will be encoded
       *  to three characters) or a sequence of three characters that does not
       *  contain the beginning of an encoded sequence ("=") and does not end
       *  with a space or tab.
       *
       * aLastThreeEOL   ( $ or \r?\n or \r )
       *
       * Line ending after aLastThree. This group is empty only if the end of
       *  the string is reached.
       *
       * aLastTwo   ( [^\t\r\n =]{0,2} )
       *
       * Up to two characters that normally precede a soft line break. None of
       *  these characters will need further encoding.
       *
       * aLastTwoEOL   ( \r?\n? )
       *
       * Optional line ending. If this group matches, then no soft line break is
       *  needed.
       */
      /([^\r\n]{0,73})(?:(=..|[ \t]|[^\r\n=]{2}[^\t\r\n =])($|\r?\n|\r)|([^\t\r\n =]{0,2})(\r?\n?))/g,
      function (aAll, aMain, aLastThree, aLastThreeEOL, aLastTwo, aLastTwoEOL,
       aOffset) {
        // Compose the main text of the line
        var line = aMain + aLastThree + aLastTwo;
        // If a line break was found in the original string
        if (aLastThreeEOL || aLastTwoEOL) {
          // If the last character in the line is a tab or a space and no soft
          //  line break will be added, encode the character
          if (line) {
            var lastChar = line[line.length - 1];
            if (lastChar === " " || lastChar === "\t") {
              line = line.slice(0, -1) + (lastChar === " " ? "=20" : "=09");
            }
          }
          // Return the line followed by a hard line break
          return line + "\r\n";
        }
        // Return the line followed by a soft line break. Since the regular
        //  expression also matches the empty string, this function is called
        //  one last time with empty parameters. In that case, do not add the
        //  soft line break.
        return line ? (line + "=\r\n") : "";
      }
    ).slice(0, -2);
  },

  /**
   * Returns a string containing the sequence of octets decoded from the given
   *  "Quoted-Printable"-encoded ASCII string.
   *
   * If the input string contains invalid characters or sequences, they are
   *  propagated to the output without errors. End-of-line character sequences
   *  in the input string are not altered when they are copied to the output.
   *
   * @param aAsciiString   "Quoted-Printable"-encoded string to be decoded. The
   *                        string may contain mixed CR, LF or CRLF end-of-line
   *                        sequences.
   */
  decodeQuotedPrintable: function(aAsciiString) {
    // Replace every soft line break and encoded character in the string. Soft
    //  line breaks are represented by an equal sign ("=") followed by any valid
    //  end-of-line sequence, while encoded characters are represented by an
    //  equal sign immediately followed by two hexadecimal digits, either
    //  uppercase or lowercase.
    return aAsciiString.replace(
      /=(?:\r?\n|\r|([A-Fa-f0-9]{2}))/g,
      function(aAll, aEncodedOctet) {
        return (aEncodedOctet ?
         String.fromCharCode(parseInt(aEncodedOctet, 16)) : "");
      }
    );
  },

  /**
   * Returns the given string of bytes encoded to "base64". For more
   *  information on the "base64" encoding specification, see
   *  <http://tools.ietf.org/html/rfc1521#section-5.2> (retrieved 2008-05-14).
   *
   * @param aOctets   String containing the octets to be encoded. Every single
   *                   character in this string must have a character code
   *                   between 0 and 255.
   */
  encodeBase64: function(aOctets) {
    // Encode to base64, and return the resulting string split across lines
    //  that are no longer than 76 characters.
    return btoa(aOctets).replace(/.{76}/g, "$&\r\n");
  },

  /**
   * Returns a string containing the sequence of octets decoded from the given
   *  "base64"-encoded ASCII string.
   *
   * Invalid characters and line breaks in the input string are filtered out.
   *
   * @param aAsciiString   "base64"-encoded string to be decoded.
   */
  decodeBase64: function(aAsciiString) {
    // Pass only the valid characters to the decoding function
    return atob(aAsciiString.replace(/[^A-Za-z0-9+\/=]+/g, ""));
  },

  /**
   * Returns an object having one property for each header field in the given
   *  header section. For more information on header field syntax, see
   *  <http://tools.ietf.org/html/rfc5322#section-2.2> (retrieved 2008-05-17).
   *
   * The property names in the returned object are the names of the header
   *  fields, converted to lowercase. If more than one header field with the
   *  same name is present in the section, the behavior is undefined.
   *
   * The property values correspond to the raw characters in the unfolded
   *  headers. For more information on header folding and unfolding, see
   *  <http://tools.ietf.org/html/rfc5322#section-2.2.3> (retrieved 2008-05-17).
   */
  collectHeadersFromSection: function(aHeaderSection) {
    // Remove any line break that is followed by a whitespace character
    var unfoldedHeders = aHeaderSection.replace(/(\r?\n|\r)(?=[\t ])/g, "");
    // Examine each valid header line, that consists of a header name, followed
    //  by a colon, followed by the header value. Header names cannot contain
    //  whitespace. If whitespace is present around the colon or at the end of
    //  the value, it is ignored. Leading whitespace on the first line of the
    //  header section is also ignored. Lines that don't conform to this syntax
    //  are ignored.
    var headers = {};
    unfoldedHeders.replace(
      /^[\t ]*([^\t\r\n :]+)[\t ]*:[\t ]*(.*)/gm,
      function(aAll, aHeaderName, aHeaderValue) {
        // Set the property of the object, and remove the trailing whitespace
        //  that may be still present in the header value
        headers[aHeaderName.toLowerCase()] = aHeaderValue.replace(/\s+$/, "");
      }
    );
    return headers;
  },

  /**
   * Returns a string of characters representing the decoded version of the
   *  provided unstructured header field value. For more information, see
   *  <http://tools.ietf.org/html/rfc5322#section-2.2.1> (retrieved 2009-08-01).
   *
   * This function attempts to decode "encoded words". For more information, see
   *  <http://tools.ietf.org/html/rfc2047#section-2> (retrieved 2009-08-01). The
   *  decoding algorithm is slightly different from the specification in that
   *  the maximum length of an encoded word is not taken into account.
   *
   * This function recognizes and ignores the optional language specification in
   *  encoded words. For more information on the subject, see
   *  <http://tools.ietf.org/html/rfc2231#section-5> (retrieved 2009-08-01).
   *
   * @param aHeaderValue   ASCII encoded value of an unstructured header field.
   *                        The string must consist of a single line of text.
   */
  parseUnstructuredValue: function(aHeaderValue) {
    // Initialize the state variable used to find adjacent encoded words
    var wordWasEncoded = false;
    // Process individual words separated by whitespace
    return aHeaderValue.replace(
      /*
       * The regular expression below is composed of the following parts:
       *
       * aWhitespace   ( [\t ]* )
       *
       * Optional whitespace before the encoded or normal word. Whitespace
       *  between two encoded words will be omitted from the output.
       *
       * aWord   ( [^\t ]+ )
       *
       * The word that will be examined to determine if it is encoded. This part
       *  will be replaced with the decoded word.
       */
      /([\t ]*)([^\t ]+)/g,
      function(aAll, aWhitespace, aWord) {
        // Remember if the previous word was encoded 
        var previousWordWasEncoded = wordWasEncoded;
        // Decode the current word and remember if decoding has been performed
        wordWasEncoded = false;
        var decodedWord = aWord.replace(
          /*
           * The regular expression below is composed of the following parts:
           *
           * aCharset   ( [^*?]+ )
           *
           * Character set specification defined inside the charset portion that
           *  immediately follows the initial "=?" sequence.
           *
           * aLanguage   ( [^?]+ )
           *
           * Optional language tag, defined after the asterisk ("*") inside the
           *  charset portion that follows the initial "=?" sequence.
           *
           * aEncoding   ( [^?]+ )
           *
           * Encoding portion that follows the first question mark ("?").
           *
           * aText   ( [^?]+ )
           *
           * Encoded text portion that follows the second question mark ("?")
           *  and comes before the final "?=" sequence.
           */
          /^=\?([^*?]+)(?:\*([^?]+))?\?([^?]+)\?([^?]+)\?=$/,
          function(aAll, aCharset, aLanguage, aEncoding, aText) {
            // Decode the octets specified in the encoded text
            var octets;
            switch (aEncoding.toUpperCase()) {
              case "B":
                // For the "B" encoding, we can use "base64" decoding
                octets = MimeSupport.decodeBase64(aText);
                break;
              case "Q":
                // For the "Q" encoding, we can use "Quoted-Printable" decoding,
                //  except that the underscore ("_") must be translated to space
                //  before the operation.
                octets = MimeSupport.decodeQuotedPrintable(
                 aText.replace("_", "=20"));
                break;
              default:
                // The encoding is unknown, stop now and don't alter the word
                return aAll;
            }
            // Decode the characters represented by the octets
            var decodedText;
            try {
              // Convert the octets to characters using the specified charset
              var converter =
               Cc["@mozilla.org/intl/scriptableunicodeconverter"].
               createInstance(Ci.nsIScriptableUnicodeConverter);
              converter.charset = aCharset;
              decodedText = converter.ConvertToUnicode(octets);
            } catch (e) {
              // If decoding failed, stop now and don't alter the word
              return aAll;
            }
            // Remember that the word was successfully decoded and replace it
            wordWasEncoded = true;
            return decodedText;
          }
        );
        // If both this word and the previous one have been decoded, remove the
        //  whitespace between the two
        return (previousWordWasEncoded && wordWasEncoded ? "" : aWhitespace) +
         decodedWord;
      }
    );
  }
}