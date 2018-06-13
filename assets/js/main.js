/**
 * Detect MSIE and add class to bode element
*/

const detectMSIE = () => {
    if (/Edge\/|Trident\/|MSIE /.test(window.navigator.userAgent)) {
        $('body').addClass('b-msie');
    }
};

/**
 * Flatten JSON object
 *
 * @param {Object} data
 * @return {Object}
*/

const flatten = (data) => {
    var result = {};
    const recurse = (cur, prop) => {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
             for(var i=0, l=cur.length; i<l; i++)
                 recurse(cur[i], prop ? prop+"."+i : ""+i);
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty)
                result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
}

/**
 * Set pager actual page and number of pages and return new settings object
 *
 * @param {String|Node} element
 * @param {Object} minData
 * @param {Object} settings
 * @return {Object}
*/

const setPager = (element, minData = {'nbPages': 0, 'page': 0, 'nbHits': 0}, settings) => {
    const $element = $(element);
    const $count = $element.find('.pager__count');
    const $outof = $element.find('.pager__count-outof');

    if (settings.page + 1 < minData.nbPages) {
        settings.page = settings.page + 1;
    } else {
        settings = false;
    }

    $count.html(minData.page + 1);
    $outof.html(minData.nbPages);

    return settings;
}

/**
 * Load items to containers with data-search-settings.
 * data-search-settings may contain following object attributes:
 *
 * @prop {String} type - search_get-filtered, search_get-all
 * @prop {Integer} page
 * @prop {String} query
 * @prop {String} target - target defines element into which will be the items loaded
 * @prop {Array} fields - array of fields (placeholder) used in item template
 * @prop {String} inputMethod - type, default
 * @prop {String} inputTarget
 *
 * @return {Void}
*/

const loadItems = () => {
    if ($('[data-search-settings]').length > 0) {

        /* List of keys that are ignored while searching */

        const searchKeyBlacklist = [
            'Delete',
            'Insert',
            'PageUp',
            'PageDown',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'Control',
            'Alt',
            'Tab'
        ];

        /* List of keys used to close search results */

        const searchKeyBackdrop = [
            'Escape'
        ];

        /**
         * Set navigation in search results using arrows
         *
         * @param {Node} items
         * @return {Void}
        */

        const navigateElements = (items) => {
            let $items = $(items);
            let $item = $items.first();

            $('body').on('keyup.search.navigate', (event) => {
                if (event.originalEvent.key === 'ArrowUp') {
                    event.preventDefault();
                    event.stopPropagation();

                    if ($item.prev().length !== 0) {
                        $item = $item.prev();
                    } else {
                        $item = $items.last();
                    }
            
                    $item.find('a').focus();
                } else if (event.originalEvent.key === 'ArrowDown') {
                    event.preventDefault();
                    event.stopPropagation();

                    if ($item.next().length !== 0) {
                        $item = $item.next();
                    } else {
                        $item = $items.first();
                    }
            
                    $item.find('a').focus();
                }
            });
        };

        /**
         * Populate items into an container
         *
         * @param {String|Node} container
         * @param {Object} settings - container settings (described in parent function description)
         * @param {Boolean} usePager
         * @return {Void|Error}
        */

        const populateData = (container, settings, usePager = false) => {
            const apiPaths = {
                'search_get-all': 'search/getAllData',
                'search_get-filtered': 'search/getFilteredData'
            }

            let accessType = 'public';

            const $container = $(container);
            const $list = $(settings.target);
            const $pager = $container.find('.pager');
            const page = settings.page;

            let query = settings.query;
            let key = settings.key;
            let $inputTarget;

            if (query !== '') {
                query = '?query=' + query;
            }

            if (key !== '') {

            }

            let itemTpl = $container.find('.template__item').html();
            itemTpl = $('<div/>').html(itemTpl).text();

            $list.empty();

            $.ajax({
                'url': '/api/v1/' + accessType + '/' + apiPaths[settings.type] + '/' + page + query
            }).done(data => {
                let status = data.type;

                if (status === 'success') {
                    const queryContent = data.content.data.query;
                    const minData = data.content.minData;
                    data = data.content.data.hits;

                    if (usePager) {
                        let _settings = setPager('.pager', minData, settings);

                        if (_settings) {
                            $('.pager a').off('click.search.pager').on('click.search.pager', (event) => {
                                event.preventDefault();

                                const $newContainer = container.parent().find('.listing__items-next');
                                const newTarget = '.listing__items-next__item[data-page="' + _settings.page + '"]';
                                $newContainer.append('<div class="listing__items-next__item" data-page="' + (_settings.page + 1) + '" />');

                                _settings.target = newTarget;

                                populateData($container, _settings, usePager);
                            });
                        } else {
                            $('.pager a').off('click.search.pager').parent().addClass('hide');
                        }
                    }

                    if (Object.keys(data).length === 0) {
                        $list.empty();
                        $list.append('<p class="no-results">Sorry, there are no items matching <em>' + queryContent + '</em> :(</p>');
                    } else {                       
                        Object.keys(data).forEach((k) => {
                            let item = flatten(data[k]);
                            let html = itemTpl;

                            settings.fields.forEach((key) => {
                                
                                /* Match {{abc}} and {{abc||def}} placeholders */

                                let pattern = new RegExp('(\{\{' + key + '(?:\|\|(.*?|\}\}))?\}\})', 'g');
                                let match;

                                do {
                                    match = pattern.exec(html);
                                    if (match) {
                                        if (typeof match[2] !== 'undefined' && match[2].indexOf('||') > -1) {
                                            if (item[key] === "" || item[key] === false) {
                                                html = html.replace(match[0], match[2].replace('||', ''));
                                            } else {
                                                html = html.replace(match[0], item[key]);
                                            }
                                        } else {
                                            html = html.replace(match[0], item[key]);
                                        }
                                    }
                                } while (match);
                            });

                            $list.append(html);
                        });

                        navigateElements($list.find('.listing__item'));
                    }
                } else {
                    return throw new Error(data);
                }
            }).fail(data => {
                return throw new Error(data);
            });
        };

        const $containers = $('[data-search-settings]');

        $containers.each((key, container) => {
            const $container = $(container);
            let settings = $container.data('search-settings');
            let $inputTarget;
            const inputMethod = settings.inputMethod || 'default';
            const $list = $(settings.target);
            const $backdrop = $('.backdrop');

            if (inputMethod === 'type') {
                $backdrop.on('click.search', (event) => {
                    $('body').removeClass('backdrop-active');

                    $list.empty();
                    $list.hide();    
                    $backdrop.hide();
                });

                $inputTarget = $(settings.inputTarget);

                $inputTarget.on('keyup.search', (event) => {
                    const query = $(event.target).val();
                    settings.query = query;

                    if (query.length === 0) {
                        $('body').removeClass('backdrop-active');

                        $list.empty();
                        $list.hide();    
                        $backdrop.hide();                        
                    }

                    if (query.length > 0 && searchKeyBackdrop.indexOf(event.originalEvent.key)) {               
                        if (searchKeyBlacklist.indexOf(event.originalEvent.key) === -1) {     
                            $('body').addClass('backdrop-active');

                            populateData($container, settings);
                            $list.show();
                            $backdrop.show();
                        
                            $('body').on('keyup.search', (event) => {
                                if (event.originalEvent.key === 'Escape') {
                                    $('body').removeClass('backdrop-active');

                                    $list.empty();
                                    $list.hide();
                                    $backdrop.hide();
                                }
                            });
                        }
                    } else {
                        $list.empty();
                        $list.hide();
                    }
                });
            } else {
                if (!$container.hasClass('donotload')) {
                    populateData($container, settings, true);
                }
            }
        });
    }
};

/**
 * Set click events to language selector
 *
 * @return {Void}
*/

const setLanguageSelector = () => {
    $('.language-selector--dropdown').off('click.language-selector').on('click.language-selector', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const $target = $(event.currentTarget);

        $target.find('.language-selector__content').toggleClass('language-selector__content--opened');
    });
};

/**
 * Toggle message states
 *
 * @return {Void}
*/

const toggleMessage = () => {
    $('.toggle-message').off('click.toggle-message').on('click.toggle-message', (event) => {
        console.log('click');
        event.preventDefault();
        event.stopPropagation();

        const $target = $(event.currentTarget).closest('.message');

        if ($target.hasClass('message--warning')) {
            $target.removeClass('message--warning').addClass('message--error');
        } else if ($target.hasClass('message--error')) {
            $target.removeClass('message--error').addClass('message--success');
        } else if ($target.hasClass('message--success')) {
            $target.removeClass('message--success').addClass('message--info');      
        } else if ($target.hasClass('message--info')) {
            $target.removeClass('message--info').addClass('message--warning');
        }                        
    });
};

detectMSIE();
loadItems();
setLanguageSelector();
toggleMessage();