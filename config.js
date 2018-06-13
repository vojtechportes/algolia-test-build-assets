const config = {
	'css_paths': [
		'./assets/css',
		'./assets/css/includes',
		'./assets/css/includes/common',
		'./assets/css/includes/components',
		'./assets/css/mixins',
		'./assets/css/skins/default',
		'./assets/css/skins/default/variables'
	],
	'js_paths': [
		'./assets/js'
	],
	'css_src_file': './assets/css/main.less',
	'css_dest_file': '../algolia-test/application/static/c/main.min.css',
	'js_src_file': './assets/js/main.js',
	'js_dest_file': '../algolia-test/application/static/j/main.es5.min.js'
};

module.exports = config;