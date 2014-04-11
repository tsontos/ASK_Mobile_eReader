//this is just some code costumed for reading my ePub files

  var ZipLoader = new JSZip();

  function cleanup() {
    $('#form-page').hide();
	$('.loader').hide();
    ZipLoader = null; //gc
  }

  $(function() {
    $('#file').change(function(event) {
      $('.upload').css('background-color', 'rgba(100, 100, 100, 0.5)').css('opacity', '0.5');
	  $('.upload p').show();
	  $('.loader').show();
      handleFiles(event.target.files, cleanup);
        //alert("The file is loading");
    });
  });

  function extractPathPrefix(location) {
    return location.substr(0, location.lastIndexOf('/') + 1);
  }

  function buildPath(currentDirectory, relativePath) {
    var curSplit = currentDirectory.split('/');
    curSplit.pop(); //remove trailing slash
    var relSplit = relativePath.split('/');
    for (var i = 0; i < relSplit.length; i++) {
      if (relSplit[i] == '..') {
        curSplit.pop();
      } else {
        curSplit.push(relSplit[i]);
      }
    }
    return curSplit.join('/');
  }

  function handleFiles(files, callback) {
    var file = files[0];
    
    //calls unzipFile once the load is finished
    var reader = makeFileReader();
    reader.onload = function(event) {
      var blob = event.target.result;
      ZipLoader.load(blob);
      var containerXML = ZipLoader.file('META-INF/container.xml').data;
      var contentLocation = $(containerXML).find('rootfile').attr('full-path');
      var pathPrefix = extractPathPrefix(contentLocation);
      loadContentXML(pathPrefix, ZipLoader.file(contentLocation).data);
      callback();
    }
    reader.readAsBinaryString(file);
  }

  function getImageUriFor(imagePath) {
    var fileExtension = (/[.]/.exec(imagePath)) && /[^.]+$/.exec(imagePath)[0] || '';
    switch (fileExtension.toLowerCase()) {
    case 'gif' :
      return "data:image/gif;base64,";
    case 'png' :
      return "data:image/png;base64,";
    case 'jpg':
    case 'jpeg':
      return "data:image/jpeg;base64,";
    }
  }

  function loadContentXML(pathPrefix, contentXML) {
    var itemLookup = {};
    var parsed = $(contentXML);
    parsed.find('manifest item').each(function(){
      itemLookup[$(this).attr('id')] = $(this).attr('href');
    });

    var entirePage = '';
    var itemRefs = parsed.find('itemref')

    itemRefs.each(function(idx){
      var href = itemLookup[$(this).attr('idref')];
      var completeHref = pathPrefix + href;
      var pagePrefix = extractPathPrefix(completeHref);
      var page = ZipLoader.file(completeHref);
      var decoded = decodeUTF8(page.data);
      var pageHtml = replaceImages(pagePrefix, decoded);
      entirePage += createNewPage(pageHtml);
    });
    $('#container').append(entirePage);
  }

  function replaceImages(pagePrefix, pageContents){
    //prevent loading images when we parse the string
    //http://stackoverflow.com/questions/2302129
    pageContents = pageContents.replace(/<img(.*?)src=(.*?)>/g, '<img$1blah=$2>');
    //console.log(pageContents);
    var newContents = $(pageContents);
    newContents.find('img').each(function(){
      var domImage = $(this);
      var imgSrc = domImage.attr('blah');
      if (imgSrc.slice(0,7) == 'http://') {
        //loading from the web, ignore it
        return true;
      }
      var location = buildPath(pagePrefix, imgSrc);
      try {
        var imageData = ZipLoader.file(location).data
      } catch (err) {
        console.log("Error while loading image, skipping");
        console.log(err);
        return true;
      }
      var base64image = Base64(imageData);
      var imageUri = getImageUriFor(imgSrc);
      domImage.attr('src', imageUri + base64image);
    });
    return newContents;
  }

  var firstPage = true;

  function createNewPage(pageHtml) {
    var i=5;
      var newPage = $('<div class="page"/>');
    newPage.html(pageHtml);
    return newPage[0].outerHTML;
  }

  function makeFileReader() {
    var reader = new FileReader();

    reader.onerror = function(event) {
      if (event.target.error.name !== undefined) {
        alert("Error: " + event.target.error.name);
        alert(event.target.error.code);
      } else {
        alert(getErrorDescription(event.target.error.code));
      }
    }
    return reader;
  }

  // for deprecated FileError object still used by chrome
  function getErrorDescription(errorCode) {
    switch (errorCode) {
      case 1: return 'File not found';
      case 2: return 'Security error, you\'re probably trying to run this ' + 
                      'locally in Chrome, which doesn\'t work. Try firefox ' + 
                      'or run it on a server';
      case 3: return 'File upload aborted';
      case 4: return 'File wasn\'t readable';
      case 5: return 'Data URL too long';
      default: return 'Unknown error';
    }
  }

  function decodeUTF8(str) {
    return decodeURIComponent(escape(str));
  }

  var Base64 = function(input) {
    var StringMaker = undefined;
    if(navigator.userAgent.toLowerCase().indexOf(" chrome/")>=0||navigator.userAgent.toLowerCase().indexOf(" firefox/")>=0||
    navigator.userAgent.toLowerCase().indexOf(' gecko/')>=0){StringMaker=function(){this.str="";this.length=0;
    this.append=function(s){this.str+=s;this.length+=s.length;};this.prepend=function(s){this.str=s+this.str;this.length+=s.length;};
    this.toString=function(){return this.str;}}}else{StringMaker=function(){this.parts=[];this.length=0;this.append=function(s){
    this.parts.push(s);this.length+=s.length;};this.prepend=function(s){this.parts.unshift(s);this.length+=s.length;};
    this.toString=function(){return this.parts.join('');}}}
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o=new StringMaker(),a,b,c,d,f,g,h,i=0;while(i<input.length){a=input.charCodeAt(i++);
    b=input.charCodeAt(i++);c=input.charCodeAt(i++);d=a>>2;f=((a&3)<<4)|(b>>4);g=((b&15)<<2)|(c>>6);h=c&63;
    if(isNaN(b)){g=h=64;}else if(isNaN(c)){h=64;}o.append(keyStr.charAt(d)+keyStr.charAt(f)+keyStr.charAt(g)
    +keyStr.charAt(h));}return o.toString();
  }