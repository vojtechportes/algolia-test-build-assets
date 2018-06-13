$.fn.refresh = function() {
    return $(this.selector);
};

$.fn.equalizeHeights = function () {
    const maxHeight = this.map((i, e) => {
        return $(e).height();
    }).get();
    return this.height(Math.max.apply(this, maxHeight));
};

/**/

const getURLVars = (querystring = false) => {
    let vars = {}, hash;
    const hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    
    for(let i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars[hash[0]] = hash[1];
    }

    if (querystring) {
        return serialize(vars);
    } else {
        return vars;
    }
}

/**/

const serialize = (obj, prefix) => {
    let str = [], p;

    for (p in obj) {
        if (obj.hasOwnProperty(p)) {
            let k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
            str.push((v !== null && typeof v === "object") ?
            serialize(v, k) :
            encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
    }

    return str.join("&");
}

const setPager = (element, minData = {'nbPages': 0, 'page': 0, 'nbHits': 0}, settings) => {
    console.log(minData);

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

const loadItems = () => {
    if ($('[data-search-settings]').length > 0) {
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
        const searchKeyBackdrop = [
            'Escape'
        ];

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
            let $inputTarget;

            if (query !== '') {
                query = '?query=' + query;
            }

            let itemTpl = $container.find('.template__item').html();
            itemTpl = $('<div/>').html(itemTpl).text();

            $list.empty();

             console.log('/api/v1/' + accessType + '/' + apiPaths[settings.type] + '/' + page + query);

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
                            let item = data[k];
                            let html = itemTpl;

                            settings.fields.forEach((key) => {
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

                            if (k + 1 % 4 == 0) {
                                $list.append('<div class="clearfix" />');
                            }
                        });

                        if (typeof settings.equalizeHeights !== 'undefined') {
                            $list.find(settings.equalizeHeights).equalizeHeights();
                        }

                        navigateElements($list.find('.listing__item'));
                    }
                } else {
                    console.log('fail');
                }
            }).fail(data => {
                console.log(data);
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

loadItems();