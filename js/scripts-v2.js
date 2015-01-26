(function() {
  var dropzoneTemplate;

  dropzoneTemplate = "<div class=\"dz-preview dz-file-preview\">\n  <div class=\"dz-details\">\n    <div class=\"dz-filename\">\n      <span data-dz-name></span>\n    </div>\n    <div class=\"dz-size\" data-dz-size></div>\n  </div>\n  <div class=\"dz-progress-container\">\n    <div class=\"dz-progress\"><span class=\"dz-upload\" data-dz-uploadprogress></span></div>\n    <span class=\"dz-progress-percent\"></span>\n  </div>\n  <div class=\"dz-actions\">\n    <span data-dz-errormessage class=\"dz-status\">Uploading file...</span>\n    <a class=\"warn\" data-dz-remove data-href=\"cancel\" href=\"#\">Cancel</a>\n  </div>\n</div>";

  $(function() {
    var api, date, day, days, dd, deleteHandler, description, dropzone, email, handler, handlerSetup, hours, min, mins, month, months, order, price, promo, refreshURLs, showPromo, suffix, updateMins, updateOrderAmt, urls, y;
    api = "http://api.transcriptengine.com";
    if (document.location.hostname === 'localhost') {
      api = "http://localhost:8080";
    }
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    date = new Date();
    date.setDate(date.getDate() + 2);
    day = days[date.getDay()];
    dd = date.getDate();
    month = months[date.getMonth()];
    y = date.getFullYear();
    min = date.getMinutes();
    hours = date.getHours();
    suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours > 12 ? hours(-12) : hours;
    hours = hours === '00' ? 12 : hours;
    $('span.delivery-est').html("" + day + ", " + month + " " + dd + ", " + y + " at " + hours + ":" + min + " " + suffix);
    $('button[data-href="sendPromo"]').click(function(e) {
      var email;
      email = $('#promo-email').val();
      if (email != null) {
        return $.ajax("" + api + "/promo?email=" + email, {
          method: 'POST',
          success: function(response) {
            $('#promoModal').foundation('reveal', 'close');
            return alert('Please check your email for a Promo Code for 20% off');
          },
          error: function() {
            return alert('Something went wrong. Send us an email at team@transcriptengine.com for a Promo Code for 20% off.');
          }
        });
      } else {
        return alert('Please enter your email');
      }
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
      maxFilesize: 1000,
      url: "" + api + "/upload"
    });
    dropzone.on('uploadprogress', function(file, progress, bytesSent) {
      var el;
      el = $(".dz-preview:contains(" + file.name + ")");
      return $(el).find('.dz-progress-percent').text(Math.round(progress - 1) + "%");
    });
    dropzone.on("complete", function(file) {
      var el;
      el = $(".dz-preview:contains(" + file.name + ")");
      return $(el).find('.dz-progress-container').fadeOut();
    });
    dropzone.on('success', function(file, response) {
      var el;
      el = $(".dz-preview:contains(" + file.name + ")");
      $(el).find('a[data-href="cancel"]').text("Delete file");
      file.duration = response['duration'];
      if (file.duration != null) {
        $(el).find('.dz-status').html("Length: " + parseInt(file.duration / 60) + " minutes<br>");
      } else {
        $(el).find('.dz-status').html("Uploaded successfully but unable to guess audio length");
      }
      updateMins();
      return mixpanel.track("File upload successful");
    });
    $('[data-href="saveURL"]').click(function(e) {
      e.preventDefault();
      if ($('input#URL').val() !== '') {
        urls.push($('input#URL').val());
      }
      $('#urlModal').foundation('reveal', 'close');
      refreshURLs();
      return updateMins();
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
    $('[data-href="saveCustomLength"]').click(function(e) {
      var customLength;
      customLength = $('input[name="length"]').val();
      if (customLength !== '') {
        $('#customLength').foundation('reveal', 'close');
        updateMins(customLength);
        return;
      }
      return alert('Enter the length of the audio to be transcribed, in minutes');
    });
    mins = 0;
    updateMins = function(custom) {
      var duration, file, output, _i, _len, _ref;
      duration = 0;
      _ref = dropzone.files;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        if (file.duration != null) {
          duration += file.duration;
        }
      }
      if (custom != null) {
        output = custom;
      } else {
        output = parseInt(duration / 60);
      }
      mins = output;
      $('input[name="length"]').val(output);
      $('.audio > h4').html(output + " minutes");
      $('fieldset.duration').fadeIn();
      return updateOrderAmt();
    };
    order = 0;
    description = "";
    price = 1;
    email = "";
    promo = 0;
    updateOrderAmt = function() {
      var extras;
      extras = 0;
      if ($('#verbatim').prop('checked')) {
        extras = .25;
      }
      order = mins * (price + extras);
      if (promo > 0) {
        order = order * (1 - promo);
      }
      $('.order-amount').html("$" + (order.toFixed(2)));
      $('.order-description').html("" + mins + " minutes at $" + price + "/min");
      if (promo > 0) {
        $('.order-description').append("<br>Promo applied (20% off)");
      }
      return $('#order-total').show();
    };
    $('#verbatim').change(function(e) {
      return updateOrderAmt();
    });
    $('input[name="email"]').keyup(function(e) {
      email = $(e.target).val();
      return mixpanel.track("Entered email address");
    });
    $('button[data-href="savePromo"]').click(function(e) {
      var code;
      code = $('input[name="promo"]').val();
      if (code === 'TRANSCRIPT2015') {
        $('#addPromo').foundation('reveal', 'close');
        promo = .20;
        return updateOrderAmt();
      } else {
        return alert('Invalid promo code');
      }
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
                  'amount': parseInt(order * 100),
                  'files': window.localStorage['files'],
                  'length': "" + hours + ":" + mins
                },
                success: function(response) {
                  var image;
                  mixpanel.track("Paid successfully");
                  $('.form-container > form').html("<h3>Order Successful</h3>\n<p>We will get started on your transcript and send it to you via email when it is done!</p>\n<p>Questions? Comments? Concerns? Email us at team@transcriptengine.com!</p>\n<p>Thank you for your business!</p>");
                  image = new Image(1, 1);
                  return image.src = "//www.googleadservices.com/pagead/conversion/954869196/?value=" + (order.toFixed(2)) + "&amp;currency_code=USD&amp;label=4JEOCPq8iVkQzMuoxwM&amp;guid=ON&amp;script=0";
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
      if ($('#verbatim').prop('checked')) {
        fileString += "VERBATIM TRANSCRIPTION REQUESTED \n";
      }
      files = fileString;
      mixpanel.track("Clicked to pay");
      if (handler == null) {
        handlerSetup();
      }
      handler.open({
        name: 'Audio Transcription',
        description: "" + mins + " mins - $" + (order.toFixed(2)),
        amount: parseInt(order * 100),
        email: email
      });
      return e.preventDefault();
    });
    $(window).on('popstate', function() {
      return handler.close();
    });
    showPromo = function() {
      return $('#promoModal').foundation('reveal', 'open');
    };
    return window.promoInit = function() {
      return setTimeout(showPromo, 1000);
    };
  });

}).call(this);
