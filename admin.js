// Admin page for publishing/removing homepage posters. Only works for
// whoever is signed in as a user in the Supabase project's Auth panel — the
// table and storage bucket's Row Level Security policies reject writes from
// anyone else, so this page being public is fine; it just won't do anything
// for a visitor who isn't logged in.
(function () {
  if (!window.supabase || !window.SUPABASE_URL) return;
  var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);

  var loginPanel = document.getElementById('loginPanel');
  var adminPanel = document.getElementById('adminPanel');
  var loginForm = document.getElementById('loginForm');
  var loginStatus = document.getElementById('loginStatus');
  var logoutBtn = document.getElementById('logoutBtn');
  var uploadForm = document.getElementById('uploadForm');
  var uploadStatus = document.getElementById('uploadStatus');
  var uploadSubmit = document.getElementById('uploadSubmit');
  var fileInput = document.getElementById('posterFile');
  var singleTitleField = document.getElementById('singleTitleField');
  var singleAltField = document.getElementById('singleAltField');
  var posterTitleInput = document.getElementById('posterTitle');
  var posterAltInput = document.getElementById('posterAlt');
  var posterTagsInput = document.getElementById('posterTags');
  var bulkHint = document.getElementById('bulkHint');
  var bulkFileCount = document.getElementById('bulkFileCount');
  var posterList = document.getElementById('posterList');
  var posterCount = document.getElementById('posterCount');

  function showStatus(el, message, isError) {
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle('error', !!isError);
  }

  function publicUrl(imagePath) {
    return client.storage.from('posters').getPublicUrl(imagePath).data.publicUrl;
  }

  function showLoggedIn() {
    loginPanel.hidden = true;
    adminPanel.hidden = false;
    loadPosters();
  }

  function showLoggedOut() {
    loginPanel.hidden = false;
    adminPanel.hidden = true;
  }

  client.auth.getSession().then(function (res) {
    if (res.data.session) showLoggedIn(); else showLoggedOut();
  });

  client.auth.onAuthStateChange(function (_event, session) {
    if (session) showLoggedIn(); else showLoggedOut();
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginStatus.hidden = true;
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) {
        showStatus(loginStatus, res.error.message, true);
        return;
      }
      loginForm.reset();
    });
  });

  logoutBtn.addEventListener('click', function () {
    client.auth.signOut();
  });

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
  }

  // Turns a raw filename into a readable default title, e.g.
  // "ITV_TRIGGER-POINT_v3_final.jpg" -> "ITV Trigger Point V3 Final".
  // Just a starting point — meant to be tidied up by hand afterwards.
  function titleFromFilename(filename) {
    var base = filename.replace(/\.[^.]+$/, '');
    base = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return base.replace(/\w\S*/g, function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  // Toggle the single-image title/alt fields: they only make sense when
  // exactly one file is selected, since they can't hold one value per file.
  fileInput.addEventListener('change', function () {
    var count = fileInput.files.length;
    var isBulk = count > 1;
    singleTitleField.hidden = isBulk;
    singleAltField.hidden = isBulk;
    posterTitleInput.required = !isBulk && count === 1;
    bulkHint.hidden = !isBulk;
    if (isBulk) bulkFileCount.textContent = count;
  });

  uploadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var files = Array.prototype.slice.call(fileInput.files);
    var tagsRaw = posterTagsInput.value.trim();
    var sharedTags = tagsRaw
      ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
      : [];

    if (!files.length) {
      showStatus(uploadStatus, 'Choose at least one image.', true);
      return;
    }
    var isBulk = files.length > 1;
    if (!isBulk && !posterTitleInput.value.trim()) {
      showStatus(uploadStatus, 'Enter a title.', true);
      return;
    }

    uploadSubmit.disabled = true;

    function uploadOne(index) {
      if (index >= files.length) {
        showStatus(uploadStatus, isBulk
          ? 'Published ' + files.length + ' images. Fill in their details below whenever you like.'
          : 'Published.', false);
        uploadForm.reset();
        singleTitleField.hidden = false;
        singleAltField.hidden = false;
        bulkHint.hidden = true;
        uploadSubmit.disabled = false;
        loadPosters();
        return;
      }

      var file = files[index];
      var title = isBulk ? titleFromFilename(file.name) : posterTitleInput.value.trim();
      var alt = isBulk ? '' : posterAltInput.value.trim();
      showStatus(uploadStatus, 'Uploading ' + (index + 1) + ' of ' + files.length + '…', false);

      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      var path = Date.now() + '-' + index + '-' + slugify(title) + '.' + ext;

      client.storage.from('posters').upload(path, file).then(function (uploadRes) {
        if (uploadRes.error) throw uploadRes.error;
        return client.from('posters').insert({
          title: title,
          image_path: path,
          alt_text: alt || title,
          tags: sharedTags
        });
      }).then(function (insertRes) {
        if (insertRes.error) throw insertRes.error;
        uploadOne(index + 1);
      }).catch(function (err) {
        showStatus(uploadStatus, 'Image ' + (index + 1) + ' failed: ' + (err.message || err), true);
        uploadSubmit.disabled = false;
      });
    }

    uploadOne(0);
  });

  function loadPosters() {
    posterList.innerHTML = '<p class="admin-list-loading">Loading…</p>';
    client.from('posters').select('*').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) {
        posterList.innerHTML = '<p class="admin-list-loading">Could not load the list.</p>';
        return;
      }
      var posters = res.data || [];
      posterCount.textContent = posters.length;
      if (!posters.length) {
        posterList.innerHTML = '<p class="admin-list-loading">Nothing published yet.</p>';
        return;
      }
      posterList.innerHTML = '';
      posters.forEach(function (poster) {
        posterList.appendChild(buildCard(poster));
      });
    });
  }

  function needsSeo(poster) {
    var hasAlt = poster.alt_text && poster.alt_text.trim() && poster.alt_text.trim() !== poster.title.trim();
    var hasTags = poster.tags && poster.tags.length > 0;
    return !hasAlt || !hasTags;
  }

  function buildCard(poster) {
    var card = document.createElement('div');
    card.className = 'poster-card';

    var img = document.createElement('img');
    img.src = publicUrl(poster.image_path);
    img.alt = poster.alt_text || poster.title;
    img.loading = 'lazy';
    card.appendChild(img);

    var body = document.createElement('div');
    body.className = 'poster-card-body';

    var titleInput = document.createElement('input');
    titleInput.className = 'poster-edit-input';
    titleInput.value = poster.title;
    titleInput.placeholder = 'Title';
    titleInput.setAttribute('aria-label', 'Title');
    body.appendChild(titleInput);

    var altInput = document.createElement('input');
    altInput.className = 'poster-edit-input';
    altInput.value = poster.alt_text || '';
    altInput.placeholder = 'Alt text';
    altInput.setAttribute('aria-label', 'Alt text');
    body.appendChild(altInput);

    var tagsInput = document.createElement('input');
    tagsInput.className = 'poster-edit-input';
    tagsInput.value = (poster.tags || []).join(', ');
    tagsInput.placeholder = 'Tags, comma separated';
    tagsInput.setAttribute('aria-label', 'Tags');
    body.appendChild(tagsInput);

    var actions = document.createElement('div');
    actions.className = 'poster-card-actions';

    var flag = document.createElement('span');
    flag.className = 'poster-card-flag';
    flag.textContent = 'needs SEO';
    flag.hidden = !needsSeo(poster);
    actions.appendChild(flag);

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'poster-card-save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', function () {
      var updatedTitle = titleInput.value.trim();
      if (!updatedTitle) {
        titleInput.focus();
        return;
      }
      var updatedAlt = altInput.value.trim();
      var updatedTags = tagsInput.value.trim()
        ? tagsInput.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
        : [];
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      client.from('posters').update({
        title: updatedTitle,
        alt_text: updatedAlt || updatedTitle,
        tags: updatedTags
      }).eq('id', poster.id).then(function (res) {
        if (res.error) throw res.error;
        poster.title = updatedTitle;
        poster.alt_text = updatedAlt || updatedTitle;
        poster.tags = updatedTags;
        flag.hidden = !needsSeo(poster);
        saveBtn.textContent = 'Saved';
        saveBtn.classList.add('saved');
        setTimeout(function () {
          saveBtn.textContent = 'Save';
          saveBtn.classList.remove('saved');
          saveBtn.disabled = false;
        }, 1200);
      }).catch(function (err) {
        alert('Could not save it: ' + (err.message || err));
        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;
      });
    });
    actions.appendChild(saveBtn);

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'poster-card-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () {
      if (!confirm('Remove "' + poster.title + '" from the site?')) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Removing…';
      client.from('posters').delete().eq('id', poster.id).then(function (delRes) {
        if (delRes.error) throw delRes.error;
        return client.storage.from('posters').remove([poster.image_path]);
      }).then(function () {
        loadPosters();
      }).catch(function (err) {
        alert('Could not remove it: ' + (err.message || err));
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete';
      });
    });
    actions.appendChild(deleteBtn);

    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }
})();
