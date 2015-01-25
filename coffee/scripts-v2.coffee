dropzoneTemplate = """
  <div class="dz-preview dz-file-preview">
    <div class="dz-details">
      <div class="dz-filename">
        <span data-dz-name></span>
      </div>
      <div class="dz-size" data-dz-size></div>
    </div>
    <div class="dz-progress-container">
      <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
      <span class="dz-progress-percent"></span>
    </div>
    <div class="dz-actions">
      <span data-dz-errormessage class="dz-status">Uploading file...</span>
      <a class="warn" data-dz-remove data-href="cancel" href="#">Cancel</a>
    </div>
  </div>
"""

$ ->

  api = "http://api.transcriptengine.com"
  if document.location.hostname is 'localhost'
    api = "http://localhost:8080"

  $('a[data-href="#main-cta"]').click (e) ->
    mixpanel.track "Clicked main CTA"
    $('html, body').animate({scrollTop: $(".order-form").offset().top}, 500)

  $('button[data-href="sendPromo"]').click (e) ->
    email = $('#promo-email').val()
    if email?
      $.ajax "#{api}/promo?email=#{email}",
        method: 'POST'
        success: (response) ->
          $('#promoModal').foundation('reveal', 'close')
          alert('Please check your email for a Promo Code for 20% off')
        error: () ->
          alert('Something went wrong. Send us an email at team@transcriptengine.com for a Promo Code for 20% off.')
    else 
      alert('Please enter your email')
      

  $('[data-href="dropzone"]').click (e) ->
    mixpanel.track "Clicked to add files"

  $('[data-reveal-id="urlModal"]').click (e) ->
    mixpanel.track "Clicked to add URLs"

  urls = []

  Dropzone.autoDiscover = false

  dropzone = new Dropzone '[data-href="dropzone"]',
    paramName: 'asset'
    previewsContainer: '.dz-preview-container'
    previewTemplate: dropzoneTemplate
    createImageThumbnails: false
    maxFilesize: 1000
    url: "#{api}/upload"

  # update percentage count
  dropzone.on 'uploadprogress', (file, progress, bytesSent) ->
    el = $(".dz-preview:contains(#{file.name})")
    $(el).find('.dz-progress-percent').text Math.round(progress-1) + "%"

  dropzone.on "complete", (file) ->
    el = $(".dz-preview:contains(#{file.name})")
    $(el).find('.dz-progress-container').fadeOut()

  dropzone.on 'success', (file, response) ->
    el = $(".dz-preview:contains(#{file.name})")
    $(el).find('a[data-href="cancel"]').text "Delete file"
    file.duration = response['duration']
    if file.duration?
      $(el).find('.dz-status').html "Length: " +  parseInt(file.duration / 60) + " minutes<br>"
    else
      $(el).find('.dz-status').html "Uploaded successfully but unable to guess audio length"
    do updateMins
    mixpanel.track "File upload successful"

  $('[data-href="saveURL"]').click (e) ->
    do e.preventDefault
    unless $('input#URL').val() is ''
      urls.push $('input#URL').val()
    $('#urlModal').foundation('reveal', 'close')
    do refreshURLs

  updateMins = ->
    duration = 0
    for file in dropzone.files
      if file.duration?
        duration += file.duration
    $('input[name="length"]').val(parseInt(duration/60))
    do updateOrderAmt

  refreshURLs = () ->
    $('ul.added-URLs').html ''

    for url, index in urls
      $('ul.added-URLs').append """
        <li data-URL-index='#{index}'>
          <span>#{url}</span>
          <div class="dz-actions">
            <a class="warn" data-href="delete-URL" href="#">Remove</a>
          </div>
        </li>
      """

    $('ul.added-URLs').show()
    do deleteHandler

  deleteHandler = ->
    $('a[data-href="delete-URL"]').click (e) ->
      do e.preventDefault
      i = $(e.currentTarget).closest('li').attr('data-URL-index')
      urls.splice(i, 1)
      do refreshURLs


  order = 0.00
  description = ""
  price = 1
  hours = 0
  mins = 0
  email = ""
  promo = 0


  updateOrderAmt = ->
    mins = parseInt($('input[name="length"]').val() || 0)
    extras = 0
    if $('#verbatim').prop('checked')
      console.log 'it is checked'
      extras = .25
    order = mins * (price + extras)

    if promo > 0
      order = order * (1-promo)

    $('.order-amount').html "$#{order.toFixed(2)}"
    $('.order-description').html "#{mins} minutes at $#{price}/min"

    if promo > 0
      $('.order-description').append "<br>Promo applied (20% off)"

    $('#order-total').show()

  $('#verbatim').change (e) ->
    do updateOrderAmt

  $('input[name="length"]').keyup (e) ->
    do updateOrderAmt
    mixpanel.track "Entered transcription time"

  $('input[name="email"]').keyup (e) ->
    email = $(e.target).val()
    mixpanel.track "Entered email address"

  $('button[data-href="savePromo"]').click (e) ->
    code = $('input[name="promo"]').val()
    if code is 'TRANSCRIPT2015'
      promo = .20
      do updateOrderAmt
    else
      alert('Invalid promo code')

  # STRIPE CHECKOUT --------------------------

  handler = {}

  handlerSetup = ->
    $.ajax "#{api}/stripeKey",
      method: 'GET'
      error: (err) ->
        console.log err
      success: (key) ->
        handler = StripeCheckout.configure
          key: key
          image: 'images/stripe-img.png'
          token: (token) ->
            $.ajax "#{api}/order",
              method: 'POST'
              data:
                'token': token.id
                'email': email
                'amount': parseInt(order * 100)
                'files': window.localStorage['files']
                'length': "#{hours}:#{mins}"
              success: (response) ->
                mixpanel.track "Paid successfully"
                $('.form-container > form').html """
                  <h3>Order Successful</h3>
                  <p>We will get started on your transcript and send it to you via email when it is done!</p>
                  <p>Questions? Comments? Concerns? Email us at team@transcriptengine.com!</p>
                  <p>Thank you for your business!</p>
                """
                image = new Image(1,1)
                image.src = "//www.googleadservices.com/pagead/conversion/954869196/?value=#{order.toFixed(2)}&amp;currency_code=USD&amp;label=4JEOCPq8iVkQzMuoxwM&amp;guid=ON&amp;script=0"


  do handlerSetup


  $('#checkout').on 'click', (e) ->

    if email is ""
      alert("Email is required")
      return false

    files = []

    for file in dropzone.files
      if file.status = 'success'
        files.push file.name

    if (files.length is 0 and urls.length is 0)
      alert("Error: you must upload a file to be transcribed")
      return false

    if order < 10
      alert("Minimum order size is $10")
      return false


    fileString = ""
    
    for file in files
      fileString += "File: #{file} \n"
    for url in urls
      fileString += "URL: #{url} \n"

    if $('#verbatim').prop('checked')
      fileString += "VERBATIM TRANSCRIPTION REQUESTED \n"

    files = fileString

    mixpanel.track "Clicked to pay"

    unless handler?
      do handlerSetup

    handler.open
      name: 'Audio Transcription'
      description: "#{mins} mins - $#{order.toFixed(2)}"
      amount: parseInt(order * 100)
      email: email

    do e.preventDefault

  $(window).on 'popstate', () ->
    do handler.close

  showPromo = ->
    $('#promoModal').foundation('reveal', 'open')

  setTimeout showPromo, 1000
