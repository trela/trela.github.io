---
title: Team
nav:
  order: 3
  tooltip: People and alumni
---

# {% include icon.html icon="fa-solid fa-users" %}Team

TRELA brings together students and researchers in electrical engineering, computer engineering and computer science who like to build things, measure them, and ask whether they can be trusted.

{% include section.html %}

{% include list.html data="members" component="portrait" filter="role == 'principal-investigator'" %}

## Postdoctoral researchers
{:.center}

{% include list.html data="members" component="portrait" filter="role == 'postdoc'" %}

## Ph.D. students
{:.center}

{% include list.html data="members" component="portrait" filter="role == 'phd'" %}

## M.S. and undergraduate researchers
{:.center}

{% include list.html data="members" component="portrait" filter="role == 'ms' or role == 'undergrad'" %}

{% include section.html dark=true %}

## {% include icon.html icon="fa-solid fa-user-plus" %}Join TRELA

We are looking for motivated Ph.D., M.S. and undergraduate students interested in hardware security, machine learning for chips, and analog/RF design.

{% include button.html link="contact" text="How to join" icon="fa-solid fa-arrow-right" flip=true %}
{:.center}

{% include section.html %}

## {% include icon.html icon="fa-solid fa-user-graduate" %}Alumni

Our alumni work in research and engineering at Apple, Intel, Google, Samsung, Advantest, NXP and many other companies, and hold faculty positions at universities around the world.

### Former postdoctoral researchers

{% include alumni.html degree="postdoc" %}

### Ph.D. graduates

{% include alumni.html degree="phd" %}

### M.S. graduates

{% include alumni.html degree="ms" %}

### Undergraduate researchers

{% include alumni.html degree="undergrad" %}
