// search.js — script côté client minimal
// La recherche principale est gérée dans recherche/index.njk
// Ce fichier gère la barre de recherche du header

document.addEventListener('DOMContentLoaded', function() {
  // Si on est sur la page recherche, ne rien faire ici
  if (window.location.pathname.startsWith('/recherche')) return;

  // Rediriger le formulaire header vers la page de recherche
  const forms = document.querySelectorAll('.search-form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const input = form.querySelector('input[name="q"]');
      if (input && input.value.trim()) {
        e.preventDefault();
        window.location.href = '/recherche/?q=' + encodeURIComponent(input.value.trim());
      }
    });
  });
});
