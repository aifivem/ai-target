name 'ai-target'
author 'TGIANN'
version '0.1.0'
license 'GPL-3.0-only'
description 'Targeting: markers on what you can interact with, ox_target compatible'
repository 'https://github.com/aifivem/ai-target'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'dist/web/assets/*.css',
	'dist/web/assets/*.js',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/*.html',
}
provide 'ox_target'
