(function() {
  var dropzoneTemplate;

  dropzoneTemplate = "<div class=\"dz-preview dz-file-preview\">\n  <div class=\"dz-details\">\n    <div class=\"dz-filename\">\n      <i class=\"fa fa-file-audio-o\"></i>\n      <span data-dz-name></span>\n    </div>\n    <div class=\"dz-size\" data-dz-size></div>\n  </div>\n  <div class=\"dz-progress-container\">\n    <div class=\"dz-progress\"><span class=\"dz-upload\" data-dz-uploadprogress></span></div>\n    <span class=\"dz-progress-percent\"></span>\n  </div>\n  <div class=\"dz-actions\">\n    <span data-dz-errormessage class=\"dz-status\">Uploading file...</span>\n    <a class=\"warn\" data-dz-remove data-href=\"cancel\" href=\"#\">Cancel</a>\n  </div>\n</div>";

  $(function() {
    var api, checkFiles, deleteHandler, description, dropzone, email, handler, handlerSetup, hours, mins, order, price, refreshURLs, updateOrderAmt, urls;
    api = "http://api.transcriptengine.com";
    if (document.location.hostname === 'localhost') {
      api = "http://localhost:5000";
    }
    $('a[data-href="#main-cta"]').click(function(e) {
      mixpanel.track("Clicked main CTA");
      return $('html, body').animate({
        scrollTop: $(".order-form").offset().top
      }, 500);
    });
    $('a[data-href="dropzone"]').click(function(e) {
      return mixpanel.track("Clicked to add files");
    });
    $('a[data-reveal-id="urlModal"]').click(function(e) {
      return mixpanel.track("Clicked to add URLs");
    });
    urls = [];
    dropzone = new Dropzone('a[data-href="dropzone"]', {
      paramName: 'asset',
      previewsContainer: '.dz-preview-container',
      previewTemplate: dropzoneTemplate,
      createImageThumbnails: false,
      url: "" + api + "/upload"
    });
    dropzone.on('processing', function() {
      return $('.helper').fadeOut();
    });
    dropzone.on('removedfile', function() {
      if (dropzone.files.length === 0) {
        $('.helper').fadeIn();
        return $('a[data-href="save-files"]').hide();
      }
    });
    dropzone.on('uploadprogress', function(file, progress, bytesSent) {
      return $('.dz-progress-percent').text(Math.round(progress - 1) + "%");
    });
    dropzone.on("complete", function(file) {
      return $('.dz-progress-container').fadeOut();
    });
    dropzone.on('success', function(file) {
      $('.dz-status').text("Upload complete!");
      $('a[data-href="cancel"]').text("Delete file");
      mixpanel.track("File upload successful");
      return checkFiles();
    });
    $('a[data-href="saveURL"]').click(function(e) {
      e.preventDefault();
      if ($('input#URL').val() !== '') {
        urls.push($('input#URL').val());
      }
      $('#urlModal').foundation('reveal', 'close');
      return refreshURLs();
    });
    refreshURLs = function() {
      var index, url, _i, _len;
      $('ul.added-URLs').html('');
      for (index = _i = 0, _len = urls.length; _i < _len; index = ++_i) {
        url = urls[index];
        $('ul.added-URLs').append("<li data-URL-index='" + index + "'>\n  <span><i class=\"fa fa-link\"></i> " + url + "</span>\n  <div class=\"dz-actions\">\n    <a class=\"warn\" data-href=\"delete-URL\" href=\"#\">Remove</a>\n  </div>\n</li>");
      }
      $('ul.added-URLs').show();
      checkFiles();
      return deleteHandler();
    };
    deleteHandler = function() {
      return $('a[data-href="delete-URL"]').click(function(e) {
        var i;
        e.preventDefault();
        i = $(e.currentTarget).closest('li').attr('data-URL-index');
        urls.splice(i, 1);
        return refreshURLs();
      });
    };
    checkFiles = function() {
      if (urls.length > 0 || dropzone.files.length > 0) {
        $('.helper').hide();
        return $('a[data-href="save-files"]').show();
      } else {
        $('.helper').show();
        return $('a[data-href="save-files"]').hide();
      }
    };
    $('a[data-href="back"]').click(function(e) {
      return $('a[href="#panel1"]').trigger('click');
    });
    $('a[data-href="save-files"]').click(function(e) {
      var file, fileString, files, url, _i, _j, _k, _len, _len1, _len2, _ref;
      files = [];
      _ref = dropzone.files;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        if (file.status = 'success') {
          files.push(file.name);
        }
      }
      if (files.length === 0 && urls.length === 0) {
        return;
      }
      fileString = "";
      for (_j = 0, _len1 = files.length; _j < _len1; _j++) {
        file = files[_j];
        fileString += "File: " + file + " \n";
      }
      for (_k = 0, _len2 = urls.length; _k < _len2; _k++) {
        url = urls[_k];
        fileString += "URL: " + url + " \n";
      }
      window.localStorage['files'] = fileString;
      return $('a[href="#panel2"]').trigger('click');
    });
    order = 0.00;
    description = "";
    price = .99;
    hours = 0;
    mins = 0;
    email = "";
    updateOrderAmt = function() {
      hours = parseInt($('.hour-count').val() || 0);
      mins = parseInt($('.min-count').val() || 0);
      order = ((hours * 60) + mins) * price;
      if (hours.toString().length === 1) {
        hours = "0" + hours.toString();
      }
      if (mins.toString().length === 1) {
        mins = "0" + mins.toString();
      }
      $('.order-amount').html("$" + (order.toFixed(2)));
      return $('.order-description').html("" + hours + " hours, " + mins + " minutes to be transcribed at $" + price + "/minute <br> " + window.localStorage['files']);
    };
    $('.hour-count, .min-count').keyup(function(e) {
      updateOrderAmt();
      return mixpanel.track("Entered transcription time");
    });
    $('.email-addr').keyup(function(e) {
      email = $(e.target).val();
      return mixpanel.track("Entered email address");
    });
    handler = {};
    handlerSetup = function() {
      return $.ajax("" + api + "/stripeKey", {
        method: 'GET',
        success: function(key) {
          return handler = StripeCheckout.configure({
            key: key,
            image: 'images/stripe-img.png',
            token: function(token) {
              return $.ajax("" + api + "/order", {
                method: 'POST',
                data: {
                  'token': token.id,
                  'email': email,
                  'amount': order * 100,
                  'files': window.localStorage['files'],
                  'length': "" + hours + ":" + mins
                },
                success: function(response) {
                  $('a[href="#panel3"]').trigger('click');
                  return mixpanel.track("Paid successfully");
                }
              });
            }
          });
        }
      });
    };
    handlerSetup();
    $('#checkout').on('click', function(e) {
      mixpanel.track("Clicked to pay");
      if (handler == null) {
        handlerSetup();
      }
      handler.open({
        name: 'Audio Transcription',
        description: "" + hours + " hours, " + mins + " mins - $" + (order.toFixed(2)),
        amount: order * 100,
        email: email
      });
      return e.preventDefault();
    });
    return $(window).on('popstate', function() {
      return handler.close();
    });
  });

}).call(this);
