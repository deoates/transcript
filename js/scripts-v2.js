(function() {
  var dropzoneTemplate;

  dropzoneTemplate = "<div class=\"dz-preview dz-file-preview\">\n  <div class=\"dz-details\">\n    <div class=\"dz-filename\">\n      <span data-dz-name></span>\n    </div>\n    <div class=\"dz-size\" data-dz-size></div>\n  </div>\n  <div class=\"dz-progress-container\">\n    <div class=\"dz-progress\"><span class=\"dz-upload\" data-dz-uploadprogress></span></div>\n    <span class=\"dz-progress-percent\"></span>\n  </div>\n  <div class=\"dz-actions\">\n    <span data-dz-errormessage class=\"dz-status\">Uploading file...</span>\n    <a class=\"warn\" data-dz-remove data-href=\"cancel\" href=\"#\">Cancel</a>\n  </div>\n</div>";

  $(function() {
    var api, deleteHandler, description, dropzone, email, handler, handlerSetup, hours, mins, order, price, refreshURLs, updateOrderAmt, urls;
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
    $('[data-href="dropzone"]').click(function(e) {
      return mixpanel.track("Clicked to add files");
    });
    $('[data-reveal-id="urlModal"]').click(function(e) {
      return mixpanel.track("Clicked to add URLs");
    });
    urls = [];
    Dropzone.autoDiscover = false;
    dropzone = new Dropzone('[data-href="dropzone"]', {
      paramName: 'asset',
      previewsContainer: '.dz-preview-container',
      previewTemplate: dropzoneTemplate,
      createImageThumbnails: false,
      url: "" + api + "/upload"
    });
    console.log(dropzone);
    dropzone.on('processing', function() {});
    dropzone.on('removedfile', function() {
      if (dropzone.files.length === 0) {
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
      return mixpanel.track("File upload successful");
    });
    $('[data-href="saveURL"]').click(function(e) {
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
        $('ul.added-URLs').append("<li data-URL-index='" + index + "'>\n  <span>" + url + "</span>\n  <div class=\"dz-actions\">\n    <a class=\"warn\" data-href=\"delete-URL\" href=\"#\">Remove</a>\n  </div>\n</li>");
      }
      $('ul.added-URLs').show();
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
    order = 0.00;
    description = "";
    price = 1;
    hours = 0;
    mins = 0;
    email = "";
    updateOrderAmt = function() {
      var extras;
      mins = parseInt($('input[name="length"]').val() || 0);
      extras = 0;
      if ($('#verbatim').prop('checked')) {
        console.log('it is checked');
        extras = .25;
      }
      order = mins * (price + extras);
      $('.order-amount').html("$" + (order.toFixed(2)));
      $('.order-description').html("" + mins + " minutes at $" + price + "/min");
      return $('#order-total').show();
    };
    $('#verbatim').change(function(e) {
      return updateOrderAmt();
    });
    $('input[name="length"]').keyup(function(e) {
      updateOrderAmt();
      return mixpanel.track("Entered transcription time");
    });
    $('input[name="email"]').keyup(function(e) {
      email = $(e.target).val();
      return mixpanel.track("Entered email address");
    });
    handler = {};
    handlerSetup = function() {
      return $.ajax("" + api + "/stripeKey", {
        method: 'GET',
        error: function(err) {
          return console.log(err);
        },
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
      var file, fileString, files, url, _i, _j, _k, _len, _len1, _len2, _ref;
      if (email === "") {
        alert("Email is required");
        return false;
      }
      files = [];
      _ref = dropzone.files;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        if (file.status = 'success') {
          files.push(file.name);
        }
      }
      if (files.length === 0 && urls.length === 0) {
        alert("Error: you must upload a file to be transcribed");
        return false;
      }
      if (order < 10) {
        alert("Minimum order size is $10");
        return false;
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
      files = fileString;
      mixpanel.track("Clicked to pay");
      if (handler == null) {
        handlerSetup();
      }
      handler.open({
        name: 'Audio Transcription',
        description: "" + mins + " mins - $" + (order.toFixed(2)),
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
