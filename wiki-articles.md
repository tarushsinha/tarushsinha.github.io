---
layout: page
title: "Articles"
permalink: /wiki/articles/
---
<ul>
{% for art in site.articles %}
  <li><a href="{{ art.url | relative_url }}">{{ art.title }}</a>{% if art.summary %} — {{ art.summary }}{% endif %}</li>
{% endfor %}
</ul>