---
layout: default
title: Projects
permalink: /projects/
---

{% include navigation.html %}

## Projects

<div class="projects-grid">
  {% for project in site.data.repositories %}
    {% include project-card.html project=project %}
  {% endfor %}
</div>

<!-- JavaScript for Dynamic GitHub Stats -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var repoCards = document.querySelectorAll('.project-card');
    repoCards.forEach(function(card) {
      var link = card.querySelector('a').href;
      var repoPath = link.split('github.com/')[1];  // Extract "username/repo"
      var apiUrl = 'https://api.github.com/repos/' + repoPath;
      fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
          var statsDiv = card.querySelector('.repo-stats');
          if (statsDiv && data.stargazers_count !== undefined) {
            statsDiv.innerHTML = '⭐ ' + data.stargazers_count + ' | Forks: ' + data.forks_count;
          }
        })
        .catch(error => console.error('Error fetching repo data:', error));
    });
  });
</script>
