---
layout: page
title: "Text Posts"
permalink: /wiki/textposts/
---
<ul>
{% for item in site.textposts %}
  <li><a href="{{ item.url | relative_url }}">{{ item.title }}</a>{% if item.summary %} — {{ item.summary }}{% endif %}</li>
{% endfor %}
</ul>