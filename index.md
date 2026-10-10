---
---

# Building chips you can trust
{:.hero-title}

The **Trusted and RELiable Architectures (TRELA) Lab** at UC San Diego, directed by [Prof. Yiorgos Makris]({{ "members/yiorgos-makris.html" | relative_url }}), designs integrated circuits and systems that are secure, trustworthy, and dependable.
We combine machine learning, statistical analysis, and hardware design to detect malicious hardware, protect intellectual property, cut the cost of testing, and extend the idea of a chip fingerprint to biology.
{:.hero-lead}

{% include button.html link="research" text="Our research" icon="fa-solid fa-flask" %}
{% include button.html link="publications" text="Publications" icon="fa-solid fa-book-open" %}
{% include button.html link="contact" text="Join us" icon="fa-solid fa-user-plus" %}
{:.center}

{% include section.html dark=true %}

{% include stats.html %}

{% include section.html %}

## {% include icon.html icon="fa-solid fa-compass" %}What we work on

{% include thrusts.html %}

{% include section.html background="images/background.svg" dark=true %}

## {% include icon.html icon="fa-solid fa-star" %}Research highlights

Our most cited work. TRELA's research has been cited more than 8,000 times, with an h-index of 44 ([Google Scholar](https://scholar.google.com/citations?user=dUO4lKwAAAAJ)).

{% for highlight in site.data.highlights %}
  {% include citation.html lookup=highlight.title style="rich" cited=highlight.cited %}
{% endfor %}

{% include button.html link="publications" text="All publications" icon="fa-solid fa-arrow-right" flip=true %}
{:.center}

{% include section.html %}

## {% include icon.html icon="fa-solid fa-newspaper" %}Latest news

{% for post in site.posts limit: 4 %}
  {% include post-excerpt.html lookup=post.slug %}
{% endfor %}

{% include button.html link="news" text="All news" icon="fa-solid fa-arrow-right" flip=true %}
{:.center}

{% include social-feed.html limit=6 section=true %}

{% include section.html %}

## {% include icon.html icon="fa-solid fa-handshake" %}Supported by

{% include sponsors.html %}
