(() => {
  // Mobile nav toggle
  const toggle = document.getElementById('navToggle');
  const list = document.getElementById('primaryNav');
  if (toggle && list) {
    toggle.addEventListener('click', () => {
      const isOpen = list.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Current year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Booking form handling
  const form = document.getElementById('bookingForm');
  const msg = document.getElementById('formMsg');
  if (form && msg) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = (form.getAttribute('data-whatsapp') || '').replace(/[^\d]/g, '');
      if (!phone) {
        msg.textContent = 'WhatsApp number not configured.';
        return;
      }
      const formData = new FormData(form);
      const name = formData.get('name') || '';
      const email = formData.get('email') || '';
      const userPhone = formData.get('phone') || '';
      const address = formData.get('address') || '';
      const bedrooms = formData.get('bedrooms') || '';
      const bathrooms = formData.get('bathrooms') || '';
      const date = formData.get('date') || '';
      const notes = formData.get('notes') || '';
      const extras = formData.getAll('extras');

      const lines = [
        'New cleaning request:',
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${userPhone}`,
        `Address: ${address}`,
        `Bedrooms: ${bedrooms}`,
        `Bathrooms: ${bathrooms}`,
        `Preferred date: ${date}`,
        extras.length ? `Extras: ${extras.join(', ')}` : 'Extras: none',
        notes ? `Notes: ${notes}` : ''
      ].filter(Boolean);

      const text = encodeURIComponent(lines.join('\n'));
      const url = `https://wa.me/${phone}?text=${text}`;
      msg.textContent = 'Opening WhatsApp...';
      window.open(url, '_blank', 'noopener');
    });
  }
})();


