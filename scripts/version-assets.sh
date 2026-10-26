#!/bin/sh
# Stamps asset links in every page with the asset's content hash (style.css?v=1a2b3c4d), so
# browsers fetch the new file as soon as it changes instead of keeping a cached copy for the
# 10 minutes GitHub Pages allows. Run after editing style.css, motion.js, theme.js or icon.png.
set -e
cd "$(dirname "$0")/.."
for asset in style.css motion.js theme.js icon.png; do
	v=$(shasum "$asset" | cut -c1-8)
	find . -name '*.html' -not -path './.git/*' -exec \
		perl -pi -e "s{\\b\Q$asset\E(\\?v=[0-9a-f]+)?\"}{$asset?v=$v\"}g" {} +
done
