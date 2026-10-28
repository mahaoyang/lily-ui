// ACP allows grouped select choices; callers share the same flattening rules.
export function optionChoices(option) {
  return (option?.options || []).flatMap(choice => choice.options || [choice]);
}

export function modelChoices(configOptions = []) {
  return optionChoices(configOptions.find(option => option.id === 'model'));
}

// Simulation choices belong only to the simulation session, never real templates.
export function catalogModels(configOptions) {
  return modelChoices(configOptions)
    .filter(model => typeof model.value === 'string' && model.value && model.value !== 'simulation')
    .map(model => ({ value: model.value, name: model.name || model.value }));
}
