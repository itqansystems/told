/** @odoo-module **/

import basicFields from "web.basic_fields";
import fieldRegistry from "web.field_registry";
import rpc from "web.rpc";
import { qweb } from "web.core";
import  field_utils from "web.field_utils";

jQuery.expr[':'].caseContains = function(a, i, m) {
 return jQuery(a).text().toUpperCase()
     .indexOf(m[3].toUpperCase()) >= 0;
};

var kpiFormulaWidget = basicFields.DebouncedField.extend({
    className: 'o_field_kpi_formula',
    tagName: 'div',
    resetOnAnyFieldChange: false,
    supportedFieldTypes: ['char'],
    events: _.extend({}, basicFields.DebouncedField.prototype.events, {
        "keyup .kpi-search-input": "_onSearch",
        "change .kpi-number-input": "_onChangeNumber",
    }),
    jsLibs: [
        '/kpi_scorecard/static/lib/draggabilly/draggabilly.pkgd.js',
    ],
    /*
     * Re-write to show formula without drag and drop
    */ 
    _renderReadonly: function () {
        var self = this;
        rpc.query({
            model: "kpi.item",
            method: 'action_render_formula',
            args: [this.value],
        }).then(function (formulaparts) {
            var template = qweb.render('formulaWidgetreadOnly', {"formulaparts": formulaparts});
            self.$el.html(template);
            return template
        });
    },
    /*
     * Re-write to show formula constructor
    */ 
    _renderEdit: function () {
        var self = this;
        var kpiID = parseInt(self.res_id);
        rpc.query({
            model: "kpi.item",
            method: 'action_return_measures',
            args: [[kpiID], this.value],
        }).then(function (variables) {
            var template = qweb.render('formulaWidget', variables);
            self.$el.html(template);
            self._onActivateDraggable(self.$('.kpi-element'));
            self._onActivateDraggable(self.$('.kpi-formula-part'));
            return template
        });
    },
    /*
     * The method to proceed search by variables
    */ 
    _onSearch: function(event) {
        var searchValue = event.currentTarget.value,
            setId = event.currentTarget.id;
        if (setId) {
            var setContainer = false;
            if (setId == "MEASURE") {
                setContainer = this.$(".kpi-set-measurements");
            } else if (setId == "KPI") {
                setContainer = this.$(".kpi-set-other-kpi");
            } else if (setId == "CONST") {
                setContainer = this.$(".kpi-set-constants");
            };
            if (setContainer) {
                var allVariables = setContainer.find(".kpi-variable");
                if (searchValue) {
                    allVariables.addClass("kpi-hidden");
                    var searchMatches = setContainer.find(".kpi-variable:caseContains("+ searchValue +")");
                    searchMatches.removeClass("kpi-hidden");
                } 
                else {
                    allVariables.removeClass("kpi-hidden");
                }
            };
        };           
    },
    /*
     * The method to apply changes in number
    */ 
    _onChangeNumber: function(event) {
        var parentElem = $(event.currentTarget).parent();
        parentElem[0].setAttribute("id", event.currentTarget.value);
    },
    /*
     * The method to render formula
    */ 
    _renderFormula: function() {
        var self = this,
            allParts = this.$(".kpi-formula-part").not(".temp-kpi-formula-part"),
            doneFormula = $.Deferred();
        var allCounter = allParts.length;
        if (allCounter > 0) {
            var formula = ""
            _.each(allParts, async function (part) {
                allCounter --;
                if (allCounter == 0) {
                    if (part && part.id) {
                        formula += part.id;
                    };
                    doneFormula.resolve(formula)
                }
                else {
                    if (part && part.id) {
                        formula += part.id + ";";
                    };  
                };
            });
        }
        else {
            doneFormula.resolve("");
        };
        return doneFormula;
    },
    /*
     * The method to move formula part while dragging
    */ 
    _createFormulaPart(targetNeighbour, targetPosition) {
        if (this.tempPart) {
            this.tempPart.remove();    
        };
        if (this.targetID && this.targetName && targetPosition 
            && (targetNeighbour.hasClass("kpi-formula-part") || targetNeighbour.hasClass("kpi-formula-parts")) )
        {
            this.tempPart = document.createElement("div");
            this.tempPart.setAttribute("id", this.targetID);
            this.tempPart.innerHTML = this.targetName;
            $(this.tempPart).addClass("kpi-formula-part");
            $(this.tempPart).addClass("temp-kpi-formula-part");           
            if (targetPosition == "left") {
                targetNeighbour.before(this.tempPart);
            }
            else if (targetPosition == "right"){
                targetNeighbour.after(this.tempPart);
            }
            else {
                $(this.tempPart).appendTo(targetNeighbour);
            };
        };
    },
    /*
     * The method to remove temp formula part since out of target container
    */ 
    _clearFormulaPart() {
        if (this.tempPart) {
            this.tempPart.remove();    
        };   
    },
    /*
     * The method to define element coordinates
    */ 
    _calculateContainerGrid(container_selector) {
        var formulaContainer = this.$(container_selector);
        var formulaContainerOffset = formulaContainer.offset();
        return {
            "y1": formulaContainerOffset.top,
            "y2": formulaContainerOffset.top + formulaContainer.outerHeight(),
            "x1": formulaContainerOffset.left,
            "x2": formulaContainerOffset.left + formulaContainer.outerWidth(),
        };
    },
    /*
     * The method to calculate top, left positions and to which container it belongs
    */ 
    _calculateTargetPosition(targetObject) {
        var position = targetObject.offset();
        var currentTop = position.top, 
            currentLeft = position.left,
            formulaGrid = this._calculateContainerGrid(".kpi-content"),
            containerPosition = false;
        if (currentTop >= formulaGrid.y1 && currentTop <= formulaGrid.y2 
            && currentLeft + targetObject.outerWidth() >= formulaGrid.x1 && currentLeft <= formulaGrid.x2) {
            // inside formula container
            containerPosition = "formula"
        };
        return {
            "currentTop": currentTop,
            "currentLeft": currentLeft,
            "containerPosition": containerPosition,
        };
    },
    /*
     * The method to find the closest formula part neighbour
    */ 
    _findClosestNeighbour(currentTop, currentLeft) {
        var self = this,
            allParts = this.$(".kpi-formula-part").not(".temp-kpi-formula-part"),
            doneNighbour = $.Deferred();
        var allCounter = allParts.length,
            targetAn = false,
            closestDistance = false,
            targetPosition = false; 
        if (allCounter > 0) {
            _.each(allParts, async function (part) {
                if (part != self.targetDOM) {
                    var offset = $(part).offset();
                    var partTop = offset.top, 
                        partLeft = offset.left;
                    var xDist = partTop - currentTop,
                        yDist = partLeft - currentLeft;
                    var distance = Math.sqrt(xDist * xDist + yDist * yDist);
                    if (!closestDistance || distance < closestDistance) {
                        targetAn = $(part);
                        closestDistance = distance;
                        //  && currentTop <= partTop + $(part).outerHeight()
                        if (currentLeft <= partLeft + 2) {
                            targetPosition = "left";
                        }
                        else {
                            targetPosition = "right";
                        };
                    };
                };

                allCounter --;
                if (allCounter == 0) {
                    doneNighbour.resolve({
                        "targetNeighbour": targetAn, 
                        "targetPosition": targetPosition,
                    })
                };
            });
        }
        else {
            // if not formula part yet
            doneNighbour.resolve({
                "targetNeighbour": self.$(".kpi-formula-parts"),
                "targetPosition": "inside",
            })
        };
        return doneNighbour;
    },
    /*
     * The method to activate draggable lib and assign event listeners
    */ 
    _onActivateDraggable: function(dragEl) {
        var self = this;
        var $draggable = dragEl.draggabilly({}); 
        $draggable.on( 'dragStart', function(event, pointer) {
            self._onDragStart(event, pointer);
        });
        $draggable.on( 'dragMove', function(event, pointer, moveVector) {
            self._onDragMove(event, pointer, moveVector);
        });
        $draggable.on( 'dragEnd', function(event, pointer) {
            self._onDragEnd(event, pointer);
        });
        $draggable.on( 'staticClick', function(event, pointer) {
            self._onStatiClick(event, pointer);
        });
    },
    /*
     * The method to avoid dragging multiple objects and do not calc those for each move
    */ 
    _onDragStart: function (event, pointer) {
        if (!this.targetObject) {
            this.targetDOM = event.currentTarget;
            this.targetObject =  $(event.currentTarget);
            this.targetID = event.currentTarget.id;
            this.targetName = event.currentTarget.innerHTML;
            if ($(event.currentTarget).hasClass("kpi-number")) {
                this.targetName = event.currentTarget.id;
            };
            var initalOffset = this.targetObject.offset();
            this.targetObject.attr("style", "position: absolute;");
            this.targetObject.offset(initalOffset);
        };
    },
    /*
     * The method to show the current position of formula part
    */ 
    _onDragMove: function (event, pointer, moveVector) {
        var self = this;        
        var targetPositions = self._calculateTargetPosition(this.targetObject); 
        if (targetPositions.containerPosition == "formula") {
            self._findClosestNeighbour(targetPositions.currentTop, targetPositions.currentLeft).then(function (neighbourData) {
                self._createFormulaPart(neighbourData.targetNeighbour, neighbourData.targetPosition);    
            })   
        }
        else {
            self._clearFormulaPart();
        };
    },
    /*
     * The method to finalize drop
    */ 
    _onDragEnd: function (event, pointer) {
        var self = this;
        if (self.tempPart) {
            // make temp part as a constant part of the formula
            $(self.tempPart).removeClass("temp-kpi-formula-part");
            self._onActivateDraggable($(self.tempPart));
            self.tempPart = false;    
        };
        if (self.targetObject.hasClass("kpi-element")) {
            // put target object back to the navigation
            self.targetObject.removeClass();
            self.targetObject.attr("style", "");
            self.targetObject.addClass("kpi-element");                                    
        }
        else {
            // move initial formula part
            self.targetObject.remove();
        };
        //  let other elements be draggable
        self.targetObject = false;
        self.targetID = false;
        self.targetName = false;
        self.targetDOM = false;
        // notify changes
        self._renderFormula().then(function (formula) {
            self._setValue(formula, {"notifyChange": true})
        });
    },
    /*
     * The method to show variables full details
    */ 
    _onStatiClick: function(event, pointer) {
        // 
        var self = this;
        self._rpc({
            model: "kpi.item",
            method: "action_open_formula_part",
            args: [event.currentTarget.id],
        }).then(function (action) {
            if (action) {
                self.do_action(action);
            }
        }); 
    },
});

fieldRegistry.add('kpiFormulaWidget', kpiFormulaWidget);

export default kpiFormulaWidget;
