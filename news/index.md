---
title: News
nav:
  order: 4
  tooltip: Highlights, awards and lab life
---

# {% include icon.html icon="fa-solid fa-newspaper" %}News

Awards, new projects, papers, press coverage and moments from lab life.

{% include section.html %}

{% include search-box.html %}

{% include tags.html tags="award, grant, paper, press, people, lab-life" %}

{% include search-info.html %}

{% include list.html data="posts" component="post-excerpt" %}

{% include social-feed.html limit=12 section=true %}
