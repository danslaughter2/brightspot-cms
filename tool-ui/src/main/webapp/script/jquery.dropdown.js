/** Better drop-down list than standard SELECT. */
(function($, win, undef) {

var doc = win.document,
        $doc = $(doc),
        $openList;

$.plugin2('dropDown', {
    '_defaultOptions': {
        'classPrefix': 'dropDown-'
    },

    'className': function(name) {
        return this.option('classPrefix') + name;
    },


    '_create': function(original) {
        var plugin = this,
                $original = $(original),
                isMultiple = $original.is('[multiple]'),
                isSearchable = $original.is('[data-searchable="true"]'),
                $input,
                $label,
                $search,
                containerCss,
                $markerContainer,
                $marker,
                $listContainer,
                $list,
                addItem;

        $input = $('<div/>', {
            'class': plugin.className('input'),
            'css': {
                'margin-bottom': $original.css('margin-bottom'),
                'margin-left': $original.css('margin-left'),
                'margin-right': $original.css('margin-right'),
                'margin-top': $original.css('margin-top'),
                'position': 'relative',
                'width': $original.outerWidth()
            }
        });

        $input.click(function() {
            if ($label.is(':visible')) {
                $label.click();

            } else {
                $search.click();
            }

            return false;
        });

        $label = $('<a/>', {
            'class': plugin.className('label'),
            'href': '#',
            'click': function() {
                if ($openList && $openList[0] === $list[0]) {
                    $list.trigger('dropDown-close');

                } else {
                    $list.trigger('dropDown-open');
                }

                return false;
            }
        });

        $label.bind('dropDown-update', function() {
            var texts = $.map($original.find('option[selected]'), function(option) {
                return $(option).text();
            });

            $label.html(texts.join(', ') || '&nbsp;');
        });

        containerCss = {
            'display': 'none',
            'position': $original.isFixedPosition() ? 'fixed' : 'absolute',
            'z-index': $original.zIndex()
        };

        $markerContainer = $('<div/>', {
            'css': containerCss
        });

        $marker = $('<div/>', {
            'class': plugin.className('marker')
        });

        $listContainer = $('<div/>', {
            'css': containerCss
        });

        $list = $('<div/>', {
            'class': plugin.className('list')
        });

        $list.bind('dropDown-open', function() {
            var offset = $input.offset(),
                    inputLarger = $input.outerWidth(true) > $listContainer.outerWidth(true);

            offset.top += $input.outerHeight();

            $listContainer.css(offset);
            $markerContainer.css(offset);
            $markerContainer.css('width', $input.outerWidth());

            $input.add($marker).add($list).toggleClass(plugin.className('input-larger'), inputLarger);
            $input.addClass(plugin.className('list-open'));

            $list.find('.' + plugin.className('listItem')).removeClass('hover');
            $list.find('.' + plugin.className('listItem') + (isMultiple ? ':first' : ':has(:checked)')).addClass('hover');

            if ($openList) {
                $openList.trigger('dropDown-close');
            }

            $openList = $list;
            $markerContainer.show();
            $listContainer.show();
        });

        $list.bind('dropDown-close', function() {
            console.log('close');
            $input.removeClass(plugin.className('list-open'));

            $openList = null;
            $markerContainer.hide();
            $listContainer.hide();
        });

        $list.bind('dropDown-hover', function(event, $item) {
            $list.find('.' + plugin.className('listItem')).removeClass('hover');

            if ($item) {
                $item.addClass('hover');
            }
        });

        // Detect clicks within the window to toggle the list properly.
        $doc.click(function(event) {
            if ($listContainer.is(':visible') &&
                    !$.contains($listContainer[0], event.target)) {
                $list.trigger('dropDown-close');
            }
        });

        // Create the list based on the options in the original input.
        addItem = function($option) {
            var $item,
                    $check;

            $item = $('<div/>', {
                'class': plugin.className('listItem'),
                'html': $option.text() || '&nbsp;'
            });

            $check = $('<input/>', {
                'type': isMultiple ? 'checkbox' : 'radio'
            });

            if ($option.is('[selected]')) {
                $check.attr('checked', 'checked');
            }

            $item.mouseenter(function() {
                $list.trigger('dropDown-hover', [ $item ]);
            });

            $item.mouseleave(function() {
                $list.trigger('dropDown-hover');
            });

            $item.click(isMultiple ? function() {
                if ($option.is('[selected]')) {
                    $option.removeAttr('selected');
                    $item.find(':checkbox').removeAttr('checked');

                } else {
                    $option.attr('selected', 'selected');
                    $item.find(':checkbox').attr('checked', 'checked');
                }

                $label.trigger('dropDown-update');
                $original.change();

                return false;

            } : function() {
                if (!$option.is('[selected]')) {
                    $original.find('option').removeAttr('selected');
                    $listContainer.find(':radio').removeAttr('checked');

                    $option.attr('selected', 'selected');
                    $check.attr('checked', 'checked');

                    $label.trigger('dropDown-update');
                    $original.change();
                }

                $list.trigger('dropDown-close');

                return false;
            });

            $item.prepend(' ');
            $item.prepend($check);
            $list.append($item);
        };

        $original.find('> optgroup, > option').each(function() {
            var $child = $(this);

            if ($child.is('option')) {
                addItem($child);

            } else {
                $list.append($('<div/>', {
                    'class': plugin.className('listGroupLabel'),
                    'text': $child.attr('label')
                }));

                $child.find('> option').each(function() {
                    addItem($(this));
                });
            }
        });

        if (!isMultiple &&
                $list.find(':has(:checked).' + plugin.className('listItem')).length === 0) {
            $list.find('.' + plugin.className('listItem')).eq(0).find(':radio').attr('checked', 'checked');
        }

        // Replace input with the custom control.
        $label.trigger('dropDown-update');
        $input.append($label);
        $original.before($input);
        $original.hide();

        $listContainer.append($list);
        $(doc.body).append($listContainer);
        $listContainer.css('min-width', $listContainer.outerWidth());

        $markerContainer.append($marker);
        $(doc.body).append($markerContainer);

        if (isSearchable) {
            $search = $('<input/>', {
                'class': plugin.className('search'),
                'type': 'text'
            });

            $search.bind('input', function() {
                var re = new RegExp($search.val().replace(/\s/, '').split('').join('(?:.*\\W)?'), 'i'),
                        $first;

                $list.find('.' + plugin.className('listItem')).each(function() {
                    var $item = $(this);

                    if (re.test($item.text())) {
                        $item.show();

                        if (!$first) {
                            $first = $item;
                        }

                    } else {
                        $item.hide();
                    }
                });

                $list.trigger('dropDown-hover', [ $first ]);
            });

            $search.click(function() {
                return false;
            });

            $list.bind('dropDown-open', function() {
                $label.hide();
                $list.find('.' + plugin.className('listItem')).show();

                $search.val($label.text());
                $search.show();
                $search.focus();
                $search.select();
            });

            $list.bind('dropDown-close', function() {
                $label.show();
                $search.hide();
            });

            $search.hide();
            $input.append($search);
        }
    }
});

$doc.keydown(function(event) {
    var which,
            isUp,
            LIST_ITEM_CLASS,
            $hover,
            hoverTop,
            hoverHeight,
            delta;

    if ($openList) {
        which = event.which;
        isUp = which === 38;

        if (!(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) {
            LIST_ITEM_CLASS = $openList.dropDown('className', 'listItem');

            if (isUp || which === 40) {
                $hover = $openList.find('.hover:visible.' + LIST_ITEM_CLASS).eq(0);

                if ($hover.length === 0) {
                    $hover = $openList.find(':visible.' + LIST_ITEM_CLASS).eq(isUp ? -1 : 0);

                } else {
                    $hover = $hover[isUp ? 'prevAll' : 'nextAll'](':visible.' + LIST_ITEM_CLASS).eq(0);
                }

                if ($hover.length > 0) {
                    $openList.trigger('dropDown-hover', [ $hover ]);

                    hoverTop = $hover.position().top;
                    hoverHeight = $hover.outerHeight();

                    if (isUp) {
                        if (hoverTop < 0) {
                            $openList.scrollTop($openList.scrollTop() + hoverTop);
                        }

                    } else {
                        delta = hoverTop + hoverHeight - $openList.height();

                        if (delta > 0) {
                            $openList.scrollTop($openList.scrollTop() + delta);
                        }
                    }
                }

                return false;

            } else if (which === 13) {
                $openList.find('.hover.' + LIST_ITEM_CLASS).click();

                return false;

            } else if (which === 27) {
                $openList.trigger('dropDown-close');

                return false;
            }
        }
    }

    return true;
});

}(jQuery, window));
