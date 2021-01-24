'use strict'

angular
  .module('forms')
  .directive('validateStripeAccountId', validateStripeAccountId)

function validateStripeAccountId() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function (_scope, _elem, _attrs, ctrl) {
      ctrl.$validators.stripeAccountValidator = (modelValue) =>
        ctrl.$isEmpty(modelValue) ||
        (modelValue.startsWith('acct_') && modelValue.length > 5)
    },
  }
}
