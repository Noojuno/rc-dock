import React from "react";
import { DockContextType } from "./DockData";
import Tabs from 'rc-tabs';
import Menu, { MenuItem } from 'rc-menu';
import Dropdown from 'rc-dropdown';
import * as DragManager from "./dragdrop/DragManager";
import { DragDropDiv } from "./dragdrop/DragDropDiv";
import { DockTabBar } from "./DockTabBar";
import DockTabPane from "./DockTabPane";
import { getFloatPanelSize } from "./Algorithm";
import { WindowBox } from "./WindowBox";
function findParentPanel(element) {
    for (let i = 0; i < 10; ++i) {
        if (!element) {
            return null;
        }
        if (element.classList.contains('dock-panel')) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}
function isPopupDiv(r) {
    var _a, _b;
    return (r == null || ((_a = r.parentElement) === null || _a === void 0 ? void 0 : _a.tagName) === 'LI' || ((_b = r.parentElement) === null || _b === void 0 ? void 0 : _b.parentElement.tagName) === 'LI');
}
export class TabCache {
    constructor(context) {
        this.getRef = (r) => {
            if (isPopupDiv(r)) {
                return;
            }
            this._ref = r;
        };
        this.getHitAreaRef = (r) => {
            if (isPopupDiv(r)) {
                return;
            }
            this._hitAreaRef = r;
        };
        this.onCloseClick = (e) => {
            this.context.dockMove(this.data, null, 'remove');
            e.stopPropagation();
        };
        this.onKeyDownCloseBtn = (evt) => {
            if (evt.key !== 'Enter' && evt.key !== ' ') {
                return false;
            }
            this.context.dockMove(this.data, null, 'remove');
            evt.stopPropagation();
        };
        this.onDragStart = (e) => {
            let panel = findParentPanel(this._ref);
            let tabGroup = this.context.getGroup(this.data.group);
            let [panelWidth, panelHeight] = getFloatPanelSize(panel, tabGroup);
            e.setData({ tab: this.data, panelSize: [panelWidth, panelHeight] }, this.context.getDockId());
            e.startDrag(this._ref.parentElement, this._ref.parentElement);
        };
        this.onDragOver = (e) => {
            let dockId = this.context.getDockId();
            let tab = DragManager.DragState.getData('tab', dockId);
            let panel = DragManager.DragState.getData('panel', dockId);
            if (tab) {
                panel = tab.parent;
            }
            else if (!panel) {
                return;
            }
            if (panel.group !== this.data.group) {
                e.reject();
            }
            else if (tab && tab !== this.data) {
                let direction = this.getDropDirection(e);
                this.context.setDropRect(this._hitAreaRef, direction, this);
                e.accept('');
            }
            else if (panel && panel !== this.data.parent) {
                let direction = this.getDropDirection(e);
                this.context.setDropRect(this._hitAreaRef, direction, this);
                e.accept('');
            }
        };
        this.onDragLeave = (e) => {
            this.context.setDropRect(null, 'remove', this);
        };
        this.onDrop = (e) => {
            let dockId = this.context.getDockId();
            let panel;
            let tab = DragManager.DragState.getData('tab', dockId);
            if (tab) {
                panel = tab.parent;
            }
            else {
                panel = DragManager.DragState.getData('panel', dockId);
            }
            if (tab && tab !== this.data) {
                let direction = this.getDropDirection(e);
                this.context.dockMove(tab, this.data, direction);
            }
            else if (panel && panel !== this.data.parent) {
                let direction = this.getDropDirection(e);
                this.context.dockMove(panel, this.data, direction);
            }
        };
        this.context = context;
    }
    setData(data) {
        if (data !== this.data) {
            this.data = data;
            this.content = this.render();
            return true;
        }
        return false;
    }
    getDropDirection(e) {
        let rect = this._hitAreaRef.getBoundingClientRect();
        let midx = rect.left + rect.width * 0.5;
        return e.clientX > midx ? 'after-tab' : 'before-tab';
    }
    render() {
        let { id, title, group, content, closable, cached, parent } = this.data;
        let { onDragStart, onDragOver, onDrop, onDragLeave } = this;
        if (parent.parent.mode === 'window') {
            onDragStart = null;
            onDragOver = null;
            onDrop = null;
            onDragLeave = null;
        }
        let tabGroup = this.context.getGroup(group);
        if (typeof content === 'function') {
            content = content(this.data);
        }
        let tab = (React.createElement(DragDropDiv, { getRef: this.getRef, onDragStartT: onDragStart, onDragOverT: onDragOver, onDropT: onDrop, onDragLeaveT: onDragLeave },
            React.createElement("div", { className: 'dock-tab-hit-area', ref: this.getHitAreaRef }),
            title,
            closable ?
                React.createElement("div", { className: 'dock-tab-close-btn', onClick: this.onCloseClick, onKeyDown: this.onKeyDownCloseBtn, tabIndex: 0 })
                : null));
        return (React.createElement(DockTabPane, { key: id, cacheId: id, cached: cached, tab: tab }, content));
    }
    destroy() {
        // place holder
    }
}
export class DockTabs extends React.PureComponent {
    constructor() {
        super(...arguments);
        this._cache = new Map();
        this.onMaximizeClick = () => {
            let { panelData } = this.props;
            this.context.dockMove(panelData, null, 'maximize');
        };
        this.onNewWindowClick = () => {
            let { panelData } = this.props;
            this.context.dockMove(panelData, null, 'new-window');
        };
        this.onKeyDownMaximizeBtn = (evt) => {
            if (evt.key !== 'Enter' && evt.key !== ' ') {
                return false;
            }
            evt.stopPropagation();
            this.onMaximizeClick();
        };
        this.renderTabBar = (props, TabNavList) => {
            let { panelData, onPanelDragStart, onPanelDragMove, onPanelDragEnd } = this.props;
            let { group: groupName, panelLock } = panelData;
            let group = this.context.getGroup(groupName);
            let { panelExtra } = group;
            let maximizable = group.maximizable;
            if (panelData.parent.mode === 'window') {
                onPanelDragStart = null;
                maximizable = false;
            }
            if (panelLock) {
                if (panelLock.panelExtra) {
                    panelExtra = panelLock.panelExtra;
                }
            }
            let showNewWindowButton = group.newWindow && WindowBox.enabled && panelData.parent.mode === 'float';
            let panelExtraContent;
            if (panelExtra) {
                panelExtraContent = panelExtra(panelData, this.context);
            }
            else if (maximizable || showNewWindowButton) {
                panelExtraContent = React.createElement("div", { className: 'dock-panel-max-btn', onClick: maximizable ? this.onMaximizeClick : null, onKeyDown: maximizable ? this.onKeyDownMaximizeBtn : null, tabIndex: 0 });
                if (showNewWindowButton) {
                    panelExtraContent = this.addNewWindowMenu(panelExtraContent, !maximizable);
                }
            }
            return (React.createElement(DockTabBar, Object.assign({ onDragStart: onPanelDragStart, onDragMove: onPanelDragMove, onDragEnd: onPanelDragEnd, TabNavList: TabNavList }, props, { extra: panelExtraContent })));
        };
        this.onTabChange = (activeId) => {
            this.props.panelData.activeId = activeId;
            this.context.onSilentChange(activeId, 'active');
            this.forceUpdate();
        };
    }
    updateTabs(tabs) {
        if (tabs === this.cachedTabs) {
            return;
        }
        this.cachedTabs = tabs;
        let newCache = new Map();
        let reused = 0;
        for (let tabData of tabs) {
            let { id } = tabData;
            if (this._cache.has(id)) {
                let tab = this._cache.get(id);
                newCache.set(id, tab);
                tab.setData(tabData);
                ++reused;
            }
            else {
                let tab = new TabCache(this.context);
                newCache.set(id, tab);
                tab.setData(tabData);
            }
        }
        if (reused !== this._cache.size) {
            for (let [id, tab] of this._cache) {
                if (!newCache.has(id)) {
                    tab.destroy();
                }
            }
        }
        this._cache = newCache;
    }
    addNewWindowMenu(element, showWithLeftClick) {
        const nativeMenu = (React.createElement(Menu, { onClick: this.onNewWindowClick },
            React.createElement(MenuItem, null, "New Window")));
        let trigger = showWithLeftClick ? ['contextMenu', 'click'] : ['contextMenu'];
        return (React.createElement(Dropdown, { prefixCls: "dock-dropdown", overlay: nativeMenu, trigger: trigger, mouseEnterDelay: 0.1, mouseLeaveDelay: 0.1 }, element));
    }
    render() {
        let { group, tabs, activeId } = this.props.panelData;
        let tabGroup = this.context.getGroup(group);
        let { animated } = tabGroup;
        if (animated == null) {
            animated = true;
        }
        this.updateTabs(tabs);
        let children = [];
        for (let [id, tab] of this._cache) {
            children.push(tab.content);
        }
        return (React.createElement(Tabs, { prefixCls: 'dock', moreIcon: '...', animated: animated, renderTabBar: this.renderTabBar, activeKey: activeId, onChange: this.onTabChange }, children));
    }
}
DockTabs.contextType = DockContextType;
DockTabs.propKeys = ['group', 'tabs', 'activeId', 'onTabChange'];
