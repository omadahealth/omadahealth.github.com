---
layout: post
title: "Password Hashing in PHP"
date: 2008-02-01 11:42
author: Austin Putman
comments: true
published: false
categories: 
---
We've been storing passwords in plaintext for a while.  Like the good folks at Reddit, we find it makes it easy to restore user account access.  More importantly, it makes it easy to log into a client install without any infrastructure beyond the mysql command line.
It is problematic because it means a database breach is a whole-system breach.  An attacker armed with an administrative login can upload files, run arbitrary scripts, and generally make mischief.  
With plain-text passwords, once that attacker has DB access, every user must change their password.  This poses logistical problems, as some users check email on a less-than-monthly basis.  It means a massive irritation and excise for our clients.  And [other means exist](http://blog.moertel.com/articles/2007/02/09/dont-let-password-recovery-keep-you-from-protecting-your-users) for restoring client access to their websites.

So how do we hash a password?  PHP's built-in MD5 and SHA1 hashes [will no longer do.](http://www.codinghorror.com/blog/archives/000949.html)  Thomas Ptacek pens [a clear, action-oriented article](http://www.matasano.com/log/958/enough-with-the-rainbow-tables-what-you-need-to-know-about-secure-password-schemes) explaining the kind of security we need.

The expected standard implements either PHK's iterative MD5 hashing or a blowfish-based asymmetrically slow algorithm.  What has driven me to the keyboard today is that neither of these is available for PHP.  The closest thing is the [phpass library.](http://www.openwall.com/phpass/)  This offers some of the functionality, but in order to get actual blowfish encryption, you have to install the [suhosin extension for php](http://www.hardened-php.net/suhosin/a_feature_list.html).

As it turns out, PHP _does_ support blowfish encryption out of the box, at least on FreeBSD machines.  After giving up on installing suhosin on my laptop, I uploaded some code to a production machine and it works beautifully.
