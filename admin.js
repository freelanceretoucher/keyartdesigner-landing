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

  uploadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var fileInput = document.getElementById('posterFile');
    var file = fileInput.files[0];
    var title = document.getElementById('posterTitle').value.trim();
    var alt = document.getElementById('posterAlt').value.trim();
    var tagsRaw = document.getElementById('posterTags').value.trim();

    if (!file || !title) {
      showStatus(uploadStatus, 'Choose an image and enter a title.', true);
      return;
    }

    var tags = tagsRaw
      ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
      : [];

    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = Date.now() + '-' + slugify(title) + '.' + ext;

    uploadSubmit.disabled = true;
    showStatus(uploadStatus, 'Uploading…', false);

    client.storage.from('posters').upload(path, file).then(function (uploadRes) {
      if (uploadRes.error) throw uploadRes.error;
      return client.from('posters').insert({
        title: title,
        image_path: path,
        alt_text: alt || title,
        tags: tags
      });
    }).then(function (insertRes) {
      if (insertRes.error) throw insertRes.error;
      showStatus(uploadStatus, 'Published.', false);
      uploadForm.reset();
      loadPosters();
    }).catch(function (err) {
      showStatus(uploadStatus, 'Something went wrong: ' + (err.message || err), true);
    }).finally(function () {
      uploadSubmit.disabled = false;
    });
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

    var title = document.createElement('p');
    title.className = 'poster-card-title';
    title.textContent = poster.title;
    body.appendChild(title);

    if (poster.tags && poster.tags.length) {
      var tags = document.createElement('p');
      tags.className = 'poster-card-tags';
      tags.textContent = poster.tags.join(', ');
      body.appendChild(tags);
    }

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
    card.appendChild(body);
    card.appendChild(deleteBtn);
    return card;
  }
})();
