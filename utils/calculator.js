/**
 * calculator.js
 * 核心伤害计算模块，与页面/Store 完全解耦。
 *
 * 使用方式：
 *   const { createCalculator } = require('../../utils/calculator')
 *   const calc = createCalculator(ctx)
 *   const result = calc.calculateSkillResult(skill, options)
 *
 * ctx 结构（由调用方在计算前组装）：
 * {
 *   form,               // 来自 calcStore.form
 *   currentSchool,      // 来自 calcStore.currentSchool
 *   currentTarget,      // 来自 calcStore.currentTarget
 *   currentSkill,       // 来自 page.data.currentSkill
 *   currentAxis,        // 来自 page.data.currentAxis
 *   selectedSet,        // 来自 calcStore.selectedSet
 *   selectedMentalities,// 来自 page.data.selectedMentalities
 *   selectedTiangong,   // 来自 page.data.selectedTiangong
 *   selectedFood,       // 来自 page.data.selectedFood
 *   setMap,             // 来自 data/Sets.js
 *   bonusMap,           // 预处理好的 { [name]: bonusDef }
 *   skills,             // 来自 data/skills.js（用于按名查找技能）
 * }
 */

/**
 * 工厂函数：传入上下文，返回一组绑定了该上下文的计算方法。
 * @param {object} ctx - 见文件头注释
 */
function createCalculator(ctx) {

  // ─────────────────────────────────────────────
  // 工具函数
  // ─────────────────────────────────────────────

  const DEFAULT_PRECISION = 12;
  const FORM_PRECISION = 4;
  const OUTPUT_PRECISION = 8;

  function toNumber(value) {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }

  function roundTo(num, digits = DEFAULT_PRECISION) {
    const n = toNumber(num);
    const factor = Math.pow(10, digits);
    return Math.round((n + Number.EPSILON) * factor) / factor;
  }

  function cleanNumber(num, digits = DEFAULT_PRECISION) {
    const rounded = roundTo(num, digits);
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  function cleanPercent(value) {
    return cleanNumber(toNumber(value) / 100, OUTPUT_PRECISION);
  }

  function cleanFormValue(num, digits = FORM_PRECISION) {
    const n = cleanNumber(num, digits);
    return n === 0 ? '' : String(n);
  }

  function toPercent(value) {
    return toNumber(value) / 100
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  function format(num) {
    return Number(num || 0).toFixed(2)
  }


  function normalizeRange(min, max) {
    const minVal = cleanNumber(min);
    const maxVal = cleanNumber(max);
    if (minVal > maxVal) return { min: minVal, max: minVal };
    return { min: minVal, max: maxVal };
  }


  function getAverage(min, max) {
    return cleanNumber((min + max) / 2);
  }

  function getValueByMode(min, max, mode) {
    if (mode === 'min') return cleanNumber(min);
    if (mode === 'max') return cleanNumber(max);
    return getAverage(min, max);
  }

  function sumNumbers(list, digits = DEFAULT_PRECISION) {
    return cleanNumber(
      (list || []).reduce((acc, item) => acc + toNumber(item), 0),
      digits
    );
  }

  // ─────────────────────────────────────────────
  // 数据解析 / 配置提取
  // ─────────────────────────────────────────────

  /**
   * 将 form 中四系属攻字段解析为结构化对象。
   */
  function getElementConfig(form) {
    const mingjinRange = normalizeRange(toNumber(form.mingjinMin), toNumber(form.mingjinMax))
    const qiansiRange  = normalizeRange(toNumber(form.qiansiMin),  toNumber(form.qiansiMax))
    const lieshiRange  = normalizeRange(toNumber(form.lieshiMin),  toNumber(form.lieshiMax))
    const pozhuRange   = normalizeRange(toNumber(form.pozhuMin),   toNumber(form.pozhuMax))

    return {
      mingjin: { name: '鸣金', min: mingjinRange.min, max: mingjinRange.max, pen: cleanNumber(toNumber(form.mingjinPen)) },
      qiansi:  { name: '牵丝', min: qiansiRange.min,  max: qiansiRange.max,  pen: cleanNumber(toNumber(form.qiansiPen))  },
      lieshi:  { name: '裂石', min: lieshiRange.min,  max: lieshiRange.max,  pen: cleanNumber(toNumber(form.lieshiPen))  },
      pozhu:   { name: '破竹', min: pozhuRange.min,   max: pozhuRange.max,   pen: cleanNumber(toNumber(form.pozhuPen))   },
    }
  }

  /**
   * 根据当前流派的主属性，返回对应的 elementKey。
   */
  function getMainElementKeyBySchool(currentSchool) {
    const map = { 鸣金: 'mingjin', 牵丝: 'qiansi', 裂石: 'lieshi', 破竹: 'pozhu' }
    return map[(currentSchool || {}).mainElement] || 'mingjin'
  }

  /**
   * 根据技能的 note 字段，在流派的 notes 列表中查找匹配的定音加成。
   */
  function getMatchedNoteInfo(currentSkill, currentSchool, form) {
    const notes        = (currentSchool || {}).notes || []
    const skillNoteName = String((currentSkill || {}).note || '').trim()

    const noteMap = [
      { name: notes[0] || '', value: toPercent(form.noteValue1) },
      { name: notes[1] || '', value: toPercent(form.noteValue2) },
      { name: notes[2] || '', value: toPercent(form.noteValue3) },
    ]

    const matched = noteMap.find(item => item.name && item.name === skillNoteName)
    return {
      matchedNoteName:  matched ? matched.name  : '',
      matchedNoteValue: matched ? matched.value : 0,
    }
  }

  /**
   * 计算武学增效带来的增伤（流派武器类型与技能 type2 匹配时生效）。
   */
  function getMartialBoostDamageIncrease(currentSkill, currentSchool, form) {
    const skillType2   = String((currentSkill || {}).type2 || '').trim()
    let total          = 0
    const appliedNames = []

    if (currentSchool.weapon1 && currentSchool.weapon1 === skillType2 && currentSchool.martialBoost1Name) {
      total = cleanNumber(total + toPercent(form.martialBoostValue1));
      appliedNames.push(currentSchool.martialBoost1Name);
    }
    if (currentSchool.weapon2 && currentSchool.weapon2 === skillType2 && currentSchool.martialBoost2Name) {
      total = cleanNumber(total + toPercent(form.martialBoostValue2));
      appliedNames.push(currentSchool.martialBoost2Name);
    }
    return { total, appliedNames }
  }

  /**
   * 根据技能的 type1/type2，计算额外增伤（全部武学增效 + 技能类型增伤）。
   */
  function getExtraDamageIncreaseBySkillType(currentSkill, form) {
    const skillType1   = String((currentSkill || {}).type1 || '').trim()
    const skillType2   = String((currentSkill || {}).type2 || '').trim()
    let total          = 0
    const appliedNames = []

    if (skillType1 === '武器') {
      const allMartialBonus = toPercent(form.allMartialBonus)
      if (allMartialBonus) {
        total = cleanNumber(total + allMartialBonus);
        appliedNames.push('全部武学增效');
      }
    }

    const type2BonusMap = {
      单体控制: { value: toPercent(form.singleControlBonus), name: '单体控制增伤' },
      单体爆发: { value: toPercent(form.singleBurstBonus),   name: '单体爆发增伤' },
      群体伤害: { value: toPercent(form.groupDamageBonus),   name: '群体伤害增伤' },
      群体异常: { value: toPercent(form.groupAbnormalBonus), name: '群体异常增伤' },
    }

    const matched = type2BonusMap[skillType2]
    if (matched && matched.value) {
      total = cleanNumber(total + matched.value);
      appliedNames.push(matched.name);
    }
    return { total, appliedNames }
  }

  /**
   * 聚合一个轴步骤上 bonus1~bonus7 字段所对应的加成数值。
   * 有条件的加成（condition 非空）需匹配当前套装或心法才生效。
   */
  function resolveStepBonuses(step, selectedSet, selectedMentalities, bonusMap) {
    const aggregated = {
      commonDamageIncrease:     0,
      extraPhysicalBonus:       0,
      extraInsightRate:         0,
      extraInsightDamageBonus:  0,
      extraPerfectRate:         0,
      extraPerfectDamageBonus:  0,
      extraDirectInsightRate:   0,
      extraDirectPerfectRate:   0,
      extraPhysicalPenetration: 0,
      ignorePhysicalDefense:    0,
      extraPhysicalDamageBonus: 0,
      extraMingjinPenetration:  0,
      extraPozhuPenetration:    0,
      extraLieshiPenetration:   0,
      extraQiansiPenetration:   0,
    }

    const bonusKeys       = ['bonus1', 'bonus2', 'bonus3', 'bonus4', 'bonus5', 'bonus6', 'bonus7']
    const activeBonusNames = bonusKeys
      .map(k => step[k])
      .filter(name => name && name !== 'N/A' && name !== '')

    activeBonusNames.forEach(bonusName => {
      const bonusDef = bonusMap[bonusName]
      if (!bonusDef) return

      if (bonusDef.condition && bonusDef.condition !== '') {
        const cond      = bonusDef.condition
        const matchSet  = selectedSet && selectedSet === cond
        const matchXinfa = selectedMentalities && selectedMentalities.includes(cond)
        if (!matchSet && !matchXinfa) return
      }

      aggregated.commonDamageIncrease     = cleanNumber(aggregated.commonDamageIncrease     + (bonusDef.commonDamageIncrease     || 0));
      aggregated.extraPhysicalBonus       = cleanNumber(aggregated.extraPhysicalBonus       + (bonusDef.extraPhysicalBonus       || 0));
      aggregated.extraInsightRate         = cleanNumber(aggregated.extraInsightRate         + (bonusDef.extraInsightRate         || 0));
      aggregated.extraInsightDamageBonus  = cleanNumber(aggregated.extraInsightDamageBonus  + (bonusDef.extraInsightDamageBonus  || 0));
      aggregated.extraPerfectRate         = cleanNumber(aggregated.extraPerfectRate         + (bonusDef.extraPerfectRate         || 0));
      aggregated.extraPerfectDamageBonus  = cleanNumber(aggregated.extraPerfectDamageBonus  + (bonusDef.extraPerfectDamageBonus  || 0));
      aggregated.extraDirectInsightRate   = cleanNumber(aggregated.extraDirectInsightRate   + (bonusDef.extraDirectInsightRate   || 0));
      aggregated.extraDirectPerfectRate   = cleanNumber(aggregated.extraDirectPerfectRate   + (bonusDef.extraDirectPerfectRate   || 0));
      aggregated.extraPhysicalPenetration = cleanNumber(aggregated.extraPhysicalPenetration + (bonusDef.extraPhysicalPenetration || 0));
      aggregated.ignorePhysicalDefense    = cleanNumber(aggregated.ignorePhysicalDefense    + (bonusDef.ignorePhysicalDefense    || 0));
      aggregated.extraPhysicalDamageBonus = cleanNumber(aggregated.extraPhysicalDamageBonus + (bonusDef.extraPhysicalDamageBonus || 0));
      aggregated.extraMingjinPenetration  = cleanNumber(aggregated.extraMingjinPenetration  + (bonusDef.extraMingjinPenetration  || 0));
      aggregated.extraPozhuPenetration    = cleanNumber(aggregated.extraPozhuPenetration    + (bonusDef.extraPozhuPenetration    || 0));
      aggregated.extraLieshiPenetration   = cleanNumber(aggregated.extraLieshiPenetration   + (bonusDef.extraLieshiPenetration   || 0));
      aggregated.extraQiansiPenetration   = cleanNumber(aggregated.extraQiansiPenetration   + (bonusDef.extraQiansiPenetration   || 0));
    })

    return aggregated
  }

  // ─────────────────────────────────────────────
  // 伤害计算核心
  // ─────────────────────────────────────────────

  /**
   * 按 min / avg / max 三种模式计算一次伤害的各部分。
   * 返回值包含 physicalPart / mainElementPart / otherElementPart / baseTotal / finalDamage。
   */
  function calcDamageByMode(mode, params) {
    const {
      physicalDefense,
      physicalRate, physicalFixed, physicalPenetration, physicalBonus,
      elementRate, elementFixed, elementBonus,
      totalDamageIncrease, noteBonus, correction,
      elements, mainElementKey, hiddenMainElementAttack,
      setExtraPhysicalBonus  = 0,
      setLowEnergyPozhuDamage = 0,
      lowEnergy               = 0,
      extraPhysicalDamageBonus = 0,
      skill,
      selectedFood,
    } = params

    const hasFood             = (selectedFood || '') === '√'
    const basePhysicalMinAttack = cleanNumber(params.basePhysicalMinAttack + (hasFood ? 90  : 0));
    const basePhysicalMaxAttack = cleanNumber(params.basePhysicalMaxAttack + (hasFood ? 180 : 0));

    let finalPhysicalAttack = 0
    if (mode === 'min') {
      finalPhysicalAttack = cleanNumber(
        (basePhysicalMinAttack + toNumber(skill.extraMinPhysicalAttack)) *
        (1 + toNumber(skill.extraMinPhysicalBonus))
      );
    } else if (mode === 'max') {
      finalPhysicalAttack = cleanNumber(
        (basePhysicalMaxAttack + toNumber(skill.extraMaxPhysicalAttack)) *
        (1 + toNumber(skill.extraMaxPhysicalBonus))
      );
    } else {
      const minVal = cleanNumber(
        (basePhysicalMinAttack + toNumber(skill.extraMinPhysicalAttack)) *
        (1 + toNumber(skill.extraMinPhysicalBonus))
      );
      const maxVal = cleanNumber(
        (basePhysicalMaxAttack + toNumber(skill.extraMaxPhysicalAttack)) *
        (1 + toNumber(skill.extraMaxPhysicalBonus))
      );
      finalPhysicalAttack = getAverage(minVal, maxVal);
    }

    const mainElement      = elements[mainElementKey]
    const mainElementAttack = getValueByMode(mainElement.min, mainElement.max, mode)

    const boostedPhysicalAttack = cleanNumber(finalPhysicalAttack * (1 + setExtraPhysicalBonus));
    const physicalPart = cleanNumber(
      ((boostedPhysicalAttack - physicalDefense) * physicalRate + physicalFixed) *
      (1 + physicalPenetration / 200) *
      (1 + physicalBonus + extraPhysicalDamageBonus)
    );

    const pozhuLowEnergyBonus =
      mainElementKey === 'pozhu' && lowEnergy === 1 ? setLowEnergyPozhuDamage : 0

      const mainElementPart = cleanNumber(
        ((mainElementAttack + hiddenMainElementAttack) * elementRate + elementFixed) *
        (1 + elementBonus + pozhuLowEnergyBonus) *
        (1 + mainElement.pen / 200)
      );

    let otherElementPart = 0
    Object.keys(elements).forEach(key => {
      if (key !== mainElementKey) {
        const item        = elements[key]
        const attackValue = getValueByMode(item.min, item.max, mode)
        otherElementPart = cleanNumber(
          otherElementPart + attackValue * physicalRate * (1 + item.pen / 200)
        );
      }
    })

    const baseTotal   = cleanNumber(physicalPart + mainElementPart + otherElementPart);
    const finalDamage = cleanNumber(baseTotal * (1 + totalDamageIncrease) * correction * (1 + noteBonus));

    return { physicalPart, mainElementPart, otherElementPart, baseTotal, finalDamage }
  }

  /**
   * 计算单个技能的完整结果（含期望伤害、命中类型概率等）。
   *
   * @param {object} skill         - 技能对象（来自 skills 列表）
   * @param {object} extraOptions  - 可选项：exhausted / yishuiStacks / bengjieStacks /
   *                                 lowEnergy / hasYishui / hasBengjie / stepBonus
   * @param {object} formOverride  - 可选，覆盖 ctx.form（词条分析用）
   * @returns {object} - 详细计算结果
   */
  function calculateSkillResult(skill, extraOptions = {}, formOverride = null) {
    const form          = formOverride  || ctx.form
    const currentTarget = ctx.currentTarget || {}
    const currentSchool = ctx.currentSchool || {}

    const emptyStepBonus = {
      commonDamageIncrease: 0, extraPhysicalBonus: 0,
      extraInsightRate: 0,     extraInsightDamageBonus: 0,
      extraPerfectRate: 0,     extraPerfectDamageBonus: 0,
      extraDirectInsightRate: 0, extraDirectPerfectRate: 0,
      extraPhysicalPenetration: 0, ignorePhysicalDefense: 0,
      extraPhysicalDamageBonus: 0,
      extraMingjinPenetration: 0, extraPozhuPenetration: 0,
      extraLieshiPenetration: 0,  extraQiansiPenetration: 0,
    }
    const stepBonus    = extraOptions.stepBonus || emptyStepBonus
    const currentSkill = skill || {}

    // ── 属性攻击配置 ───────────────────────────────────────────────
    const elements = getElementConfig(form)

    const elementKeyMap = { 鸣金: 'mingjin', 牵丝: 'qiansi', 裂石: 'lieshi', 破竹: 'pozhu' }
    const skillAttribute = String(currentSkill.attribute || '').trim()
    const mainElementKey = skillAttribute === '主属性'
      ? getMainElementKeyBySchool(currentSchool)
      : (elementKeyMap[skillAttribute] || getMainElementKeyBySchool(currentSchool))

    // 步骤加成：各系属攻穿透叠加

    elements.mingjin.pen = cleanNumber(elements.mingjin.pen + stepBonus.extraMingjinPenetration);
    elements.qiansi.pen  = cleanNumber(elements.qiansi.pen  + stepBonus.extraQiansiPenetration);
    elements.lieshi.pen  = cleanNumber(elements.lieshi.pen  + stepBonus.extraLieshiPenetration);
    elements.pozhu.pen   = cleanNumber(elements.pozhu.pen   + stepBonus.extraPozhuPenetration);

    const hiddenMainElementAttack = cleanNumber(toNumber(currentSchool.hiddenMainElementAttack));

    const physicalRange       = normalizeRange(toNumber(form.physicalMinAttack), toNumber(form.physicalMaxAttack))
    const basePhysicalMinAttack = physicalRange.min
    const basePhysicalMaxAttack = physicalRange.max

    // ── 套装加成 ───────────────────────────────────────────────────
    const selectedSet    = ctx.selectedSet || ''
    const currentSet     = selectedSet ? (ctx.setMap[selectedSet] || null) : null

    const setExtraPhysicalBonus      = cleanNumber(currentSet ? currentSet.extraPhysicalBonus      / 1 : 0);
    const setExtraInsightDamageBonus = cleanNumber(currentSet ? currentSet.extraInsightDamageBonus / 1 : 0);
    const setExtraDirectInsightRate  = cleanNumber(currentSet ? currentSet.extraDirectInsightRate  / 1 : 0);
    const setLowEnergyPozhuDamage    = cleanNumber(currentSet ? currentSet.lowEnergyPozhuDamage    / 1 : 0);
    const setCommonDamageIncrease    = cleanNumber(currentSet ? currentSet.commonDamageIncrease    / 1 : 0);

    const physicalDefenseRaw      = cleanNumber(toNumber(currentTarget.physicalDefense));
    const targetCommonDamageBonus = toPercent(currentTarget.commonDamageBonus);
    const exhausted               = cleanNumber(toNumber(extraOptions.exhausted));
    const targetExhaustedDamageBonus =
      exhausted === 1 ? toPercent(currentTarget.exhaustedDamageBonus) : 0

    // ── 易水歌 / 断石之构 ──────────────────────────────────────────
    const hasYishui  = !!extraOptions.hasYishui
    const hasBengjie = !!extraOptions.hasBengjie

    const yishuiStacks  = toNumber(extraOptions.yishuiStacks)
    const bengjieStacks = toNumber(extraOptions.bengjieStacks)

    const extraDamageIncreaseFromYishui = hasYishui  ? cleanNumber(yishuiStacks * 0.01) : 0;
    const extraPenetrationFromYishui    = hasYishui  ? cleanNumber(yishuiStacks * 2)    : 0;
    const extraInsightDamageFromBengjie = hasBengjie ? cleanNumber(bengjieStacks * 0.05) : 0;
    const extraPenetrationFromBengjie   = hasBengjie ? cleanNumber(bengjieStacks * 5)    : 0;

    // ── 可选心法加成 ───────────────────────────────────────────────
    const selectedMentalities = ctx.selectedMentalities || []
    const hasMentality        = name => selectedMentalities.includes(name)

    const mentalityDamageIncrease_征人归    = hasMentality('征人归')    ? 0.08 : 0
    const mentalityDamageIncrease_抗造大法  = hasMentality('抗造大法')  ? 0.02 : 0
    const mentalityDamageIncrease_纵地摘星  = hasMentality('纵地摘星')  ? 0.03 : 0
    const mentalityDamageIncrease_威猛歌    =
      hasMentality('威猛歌') && toNumber(currentSkill.chargeSkill) === 1 ? 0.15 : 0

    const mentalityDefenseReduce_所恨年年 = hasMentality('所恨年年') ? cleanNumber(physicalDefenseRaw * 0.06) : 0;
    const mentalityExtraPen_所恨年年        = hasMentality('所恨年年') ? 10 : 0

    const skillType2ForYiJing              = String(currentSkill.type2 || '').trim()
    const mentalityInsightBonus_移经易武   =
      (hasMentality('移经易武') && skillType2ForYiJing === '陌刀') ? 0.20 : 0


      const mentalityTotalDamageIncrease = sumNumbers([
        mentalityDamageIncrease_征人归,
        mentalityDamageIncrease_抗造大法,
        mentalityDamageIncrease_纵地摘星,
        mentalityDamageIncrease_威猛歌,
      ]);

    // ── 各项数值计算 ───────────────────────────────────────────────
    const physicalDefense = cleanNumber(
      (physicalDefenseRaw - mentalityDefenseReduce_所恨年年) * (1 - stepBonus.ignorePhysicalDefense)
    );

    const physicalRate  = cleanNumber(toNumber(currentSkill.physicalRate));
    const physicalFixed = cleanNumber(toNumber(currentSkill.physicalFixed));
    const physicalPenetration = sumNumbers([
      toNumber(form.physicalPenetration),
      toNumber(currentSkill.extraPhysicalPenetration),
      extraPenetrationFromYishui,
      extraPenetrationFromBengjie,
      mentalityExtraPen_所恨年年,
      stepBonus.extraPhysicalPenetration,
    ]);


    const physicalBonus = toPercent(form.physicalBonus)
    const elementRate   = cleanNumber(toNumber(currentSkill.elementRate));
    const elementFixed  = cleanNumber(toNumber(currentSkill.elementFixed));
    const elementBonus  = toPercent(form.elementBonus)

    const { matchedNoteName, matchedNoteValue } = getMatchedNoteInfo(currentSkill, currentSchool, form)
    const { total: martialBoostDamageIncrease, appliedNames }          = getMartialBoostDamageIncrease(currentSkill, currentSchool, form)
    const { total: extraTypeDamageIncrease,    appliedNames: extraTypeAppliedNames } = getExtraDamageIncreaseBySkillType(currentSkill, form)

    const userDamageIncrease      = toPercent(form.damageIncrease)
    const bossBonus               = toPercent(form.bossBonus)
    const skillExtraDamageIncrease = cleanNumber(toNumber(currentSkill.extraDamageIncrease));

    const selectedTiangong      = ctx.selectedTiangong || ''
    const tiangongDamageIncrease =
      selectedTiangong === '火' ? 0.015 :
      selectedTiangong === '毒' ? 0.010 : 0

      const schoolExtraDamageIncrease =
      String((currentSchool || {}).schoolName || '').trim() === '裂石均' ? 0.08 : 0

      const totalDamageIncrease = sumNumbers([
        userDamageIncrease,
        bossBonus,
        skillExtraDamageIncrease,
        martialBoostDamageIncrease,
        extraTypeDamageIncrease,
        targetCommonDamageBonus,
        targetExhaustedDamageBonus,
        extraDamageIncreaseFromYishui,
        mentalityTotalDamageIncrease,
        setCommonDamageIncrease,
        stepBonus.commonDamageIncrease,
        tiangongDamageIncrease,
        schoolExtraDamageIncrease,
      ]);


    const noteBonus  = cleanNumber(matchedNoteValue);
    const correction = cleanNumber(toNumber(currentSkill.correction) || 1);

    const precisionRate = clamp(toPercent(form.precisionRate), 0, 1)

    const normalInsightRateInput = cleanNumber(
      clamp(toPercent(form.insightRate), 0, 1) +
      toNumber(currentSkill.extraInsightRate) +
      stepBonus.extraInsightRate
    );

    const normalPerfectRateInput = cleanNumber(
      clamp(toPercent(form.perfectRate), 0, 1) +
      toNumber(currentSkill.extraPerfectRate) +
      stepBonus.extraPerfectRate
    );

    const cappedInsightRate = cleanNumber(Math.min(normalInsightRateInput, 0.8));
    const cappedPerfectRate = cleanNumber(Math.min(normalPerfectRateInput, 0.4));

    const directInsightRate = cleanNumber(
      Math.max(toPercent(form.directInsightRate), 0) +
      setExtraDirectInsightRate +
      stepBonus.extraDirectInsightRate
    );

    const directPerfectRate = cleanNumber(
      Math.max(toPercent(form.directPerfectRate), 0) +
      stepBonus.extraDirectPerfectRate
    );

    const isTiangongDot =
      currentSkill.skillName === '天工火每秒' ||
      currentSkill.skillName === '天工毒每秒'

      const finalInsightRate = isTiangongDot ? 0 : clamp(cleanNumber(cappedInsightRate + directInsightRate), 0, 1);
      const finalPerfectRate = isTiangongDot ? 0 : clamp(cleanNumber(cappedPerfectRate + directPerfectRate), 0, 1);

    const isMingjinYing      = String((ctx.currentSchool || {}).schoolName || '').trim() === '鸣金影'
    const isSpecialContinuous = String(currentSkill.special || '').trim() === '持续'
    const mingjinYingPerfectBonus = (isMingjinYing && isSpecialContinuous) ? 0.30 : 0
    const extraPhysicalBonus_回旋伞 = String(currentSkill.special || '').trim() === '回旋伞' ? 0.15 : 0

    const insightDamageBonus = sumNumbers([
      toPercent(form.insightDamageBonus),
      toNumber(currentSkill.extraInsightDamage),
      extraInsightDamageFromBengjie,
      mentalityInsightBonus_移经易武,
      setExtraInsightDamageBonus,
      stepBonus.extraInsightDamageBonus,
    ]);

    const perfectDamageBonus = sumNumbers([
      toPercent(form.perfectDamageBonus),
      toNumber(currentSkill.extraPerfectDamage),
      stepBonus.extraPerfectDamageBonus,
      mingjinYingPerfectBonus,
    ]);

      const stepBonusNames = ['bonus1', 'bonus2', 'bonus3', 'bonus4', 'bonus5', 'bonus6', 'bonus7']
      .map(key => String((extraOptions.step || {})[key] || '').trim())
      .filter(Boolean)

    const guaranteedInsightFromBonus =
      stepBonusNames.includes('芳歌') || stepBonusNames.includes('开山')

    const guaranteedInsight =
      toNumber(currentSkill.guaranteedInsight) === 1 || guaranteedInsightFromBonus


      const commonParams = {
        basePhysicalMinAttack,
        basePhysicalMaxAttack,
        physicalDefense,
        physicalRate, physicalFixed, physicalPenetration, physicalBonus,
        extraPhysicalDamageBonus: sumNumbers([
          stepBonus.extraPhysicalDamageBonus,
          stepBonus.extraPhysicalBonus,
          extraPhysicalBonus_回旋伞,
        ]),
        elementRate, elementFixed, elementBonus,
        totalDamageIncrease,
        noteBonus, correction,
        elements, mainElementKey, hiddenMainElementAttack,
        setExtraPhysicalBonus, setLowEnergyPozhuDamage,
        lowEnergy: cleanNumber(toNumber(extraOptions.lowEnergy)),
        skill:        currentSkill,
        selectedFood: ctx.selectedFood,
      };

    const minDamageObj = calcDamageByMode('min', commonParams)
    const avgDamageObj = calcDamageByMode('avg', commonParams)
    const maxDamageObj = calcDamageByMode('max', commonParams)

    const glancingDamage = cleanNumber(minDamageObj.finalDamage);
    const normalDamage   = cleanNumber(avgDamageObj.finalDamage);
    const insightDamage  = cleanNumber(avgDamageObj.finalDamage * (1 + insightDamageBonus));
    const perfectDamage  = cleanNumber(maxDamageObj.finalDamage * (1 + perfectDamageBonus));

    let glancingRate = 0, normalRate = 0, insightProcRate = 0, perfectProcRate = 0, expectedDamage = 0

    if (guaranteedInsight) {
      insightProcRate = 1;
      expectedDamage  = cleanNumber(insightDamage);
    } else {
      perfectProcRate = cleanNumber(finalPerfectRate);
      glancingRate    = cleanNumber((1 - precisionRate) * (1 - perfectProcRate));

      if (finalInsightRate + finalPerfectRate <= 1) {
        insightProcRate = cleanNumber(precisionRate * finalInsightRate);
        normalRate      = cleanNumber(1 - insightProcRate - perfectProcRate - glancingRate);
      } else {
        insightProcRate = cleanNumber(1 - perfectProcRate - glancingRate);
        normalRate      = 0;
      }

      insightProcRate = clamp(cleanNumber(insightProcRate), 0, 1);
      perfectProcRate = clamp(cleanNumber(perfectProcRate), 0, 1);
      glancingRate    = clamp(cleanNumber(glancingRate),    0, 1);
      normalRate      = clamp(cleanNumber(normalRate),      0, 1);

      expectedDamage = cleanNumber(
        glancingDamage * glancingRate +
        normalDamage * normalRate +
        insightDamage * insightProcRate +
        perfectDamage * perfectProcRate
      );
    }


    return {
      schoolName:  (ctx.currentSchool  || {}).schoolName  || '',
      skillName:   currentSkill.skillName  || '',
      targetName:  (ctx.currentTarget  || {}).targetName  || '',

      targetPhysicalDefense:    cleanNumber(toNumber(currentTarget.physicalDefense)),
      targetCommonDamageBonus:  cleanNumber(targetCommonDamageBonus, OUTPUT_PRECISION),
      targetExhaustedDamageBonus: cleanNumber(targetExhaustedDamageBonus, OUTPUT_PRECISION),

      totalDamageIncrease: cleanNumber(totalDamageIncrease, OUTPUT_PRECISION),
      correction: cleanNumber(correction, OUTPUT_PRECISION),
      noteMultiplier: cleanNumber(1 + noteBonus, OUTPUT_PRECISION),
      matchedNoteName,
      matchedNoteValue: cleanNumber(matchedNoteValue, OUTPUT_PRECISION),

      finalInsightRate: cleanNumber(finalInsightRate, OUTPUT_PRECISION),
      finalPerfectRate: cleanNumber(finalPerfectRate, OUTPUT_PRECISION),

      glancingDamage: cleanNumber(glancingDamage, OUTPUT_PRECISION),
      normalDamage:   cleanNumber(normalDamage, OUTPUT_PRECISION),
      insightDamage:  cleanNumber(insightDamage, OUTPUT_PRECISION),
      perfectDamage:  cleanNumber(perfectDamage, OUTPUT_PRECISION),
      expectedDamage: cleanNumber(expectedDamage, OUTPUT_PRECISION),

      glancingRate:    cleanNumber(glancingRate, OUTPUT_PRECISION),
      normalRate:      cleanNumber(normalRate, OUTPUT_PRECISION),
      insightProcRate: cleanNumber(insightProcRate, OUTPUT_PRECISION),
      perfectProcRate: cleanNumber(perfectProcRate, OUTPUT_PRECISION),

      avgPhysicalPart:     cleanNumber(avgDamageObj.physicalPart, OUTPUT_PRECISION),
      avgMainElementPart:  cleanNumber(avgDamageObj.mainElementPart, OUTPUT_PRECISION),
      avgOtherElementPart: cleanNumber(avgDamageObj.otherElementPart, OUTPUT_PRECISION),

      maxPhysicalPart:     cleanNumber(maxDamageObj.physicalPart, OUTPUT_PRECISION),
      maxMainElementPart:  cleanNumber(maxDamageObj.mainElementPart, OUTPUT_PRECISION),
      maxOtherElementPart: cleanNumber(maxDamageObj.otherElementPart, OUTPUT_PRECISION),

      minPhysicalPart:     cleanNumber(minDamageObj.physicalPart, OUTPUT_PRECISION),
      minMainElementPart:  cleanNumber(minDamageObj.mainElementPart, OUTPUT_PRECISION),
      minOtherElementPart: cleanNumber(minDamageObj.otherElementPart, OUTPUT_PRECISION),

      physicalPenetration: cleanNumber(physicalPenetration, OUTPUT_PRECISION),
      yishuiStacks: cleanNumber(yishuiStacks, OUTPUT_PRECISION),
      bengjieStacks: cleanNumber(bengjieStacks, OUTPUT_PRECISION),
      exhausted: cleanNumber(exhausted, OUTPUT_PRECISION),
      lowEnergy: cleanNumber(toNumber(extraOptions.lowEnergy), OUTPUT_PRECISION),

      appliedBuffs: {
        hasYishui, hasBengjie,
        extraDamageIncreaseFromYishui: cleanNumber(extraDamageIncreaseFromYishui, OUTPUT_PRECISION),
        extraPenetrationFromYishui: cleanNumber(extraPenetrationFromYishui, OUTPUT_PRECISION),
        extraInsightDamageFromBengjie: cleanNumber(extraInsightDamageFromBengjie, OUTPUT_PRECISION),
        extraPenetrationFromBengjie: cleanNumber(extraPenetrationFromBengjie, OUTPUT_PRECISION),
      },

      martialBoostApplied: [...appliedNames, ...extraTypeAppliedNames],
      insightDamageBonus: cleanNumber(insightDamageBonus, OUTPUT_PRECISION),
      perfectDamageBonus: cleanNumber(perfectDamageBonus, OUTPUT_PRECISION),
      bossBonus: cleanNumber(bossBonus, OUTPUT_PRECISION),
      martialBoostDamageIncrease: cleanNumber(martialBoostDamageIncrease + toPercent(form.allMartialBonus), OUTPUT_PRECISION),
      noteValue: cleanNumber(matchedNoteValue, OUTPUT_PRECISION),
    }
  }

  /**
   * 按名称在 ctx.skills 中查找技能对象。
   */
  function getSkillByName(skillName) {
    const name = String(skillName || '').trim()
    if (!name) return null
    return (ctx.skills || []).find(item => String(item.skillName || '').trim() === name) || null
  }

  /**
   * 计算当前轴（ctx.currentAxis）的完整结果。
   * @param {object|null} formOverride - 可选，覆盖 ctx.form（词条分析用）
   */
  function calculateCurrentAxisResult(formOverride = null) {
    const currentAxis = ctx.currentAxis

    if (!currentAxis || !Array.isArray(currentAxis.steps) || !currentAxis.steps.length) {
      return null
    }

    const hasYishui  = (ctx.selectedMentalities || []).includes('易水歌')
    const hasBengjie = (ctx.selectedMentalities || []).includes('断石之构')

    const selectedTiangong    = ctx.selectedTiangong  || ''
    const selectedMentalities = ctx.selectedMentalities || []
    const hasYishuige         = selectedMentalities.includes('易水歌')
    const hasQianshanfa       = selectedMentalities.includes('千山法')
    const hasJilequexue       = selectedMentalities.includes('极乐泣血')

    let totalExpectedDamage = 0
    const details           = []

    const filteredSteps = currentAxis.steps.filter(step => {
      const skillName = step.skillName || ''
      if (skillName === '天工火每秒' && selectedTiangong !== '火') return false
      if (skillName === '天工毒每秒' && selectedTiangong !== '毒') return false
      if (skillName === '易水歌6重'  && !hasYishuige)              return false
      if (skillName === '极乐泣血'   && !hasJilequexue)            return false
      return true
    })

    // 气涌轴 + 千山法：将次数为 0 的"90无名剑蓄力多道剑气"强制视为 1
    if ((currentAxis.axisName || '').includes('气涌轴') && hasQianshanfa) {
      const overriddenSteps = filteredSteps.map(step => {
        if (step.skillName === '90无名剑蓄力多道剑气' && toNumber(step.count) === 0) {
          return Object.assign({}, step, { count: 1 })
        }
        return step
      })
      filteredSteps.splice(0, filteredSteps.length, ...overriddenSteps)
    }

    let shushuAccumulator  = 0
    let chenSanAccumulator = 0

    filteredSteps.forEach(step => {
      const skill = getSkillByName(step.skillName)
      const count = cleanNumber(toNumber(step.count));


      if (!skill || !step.skillName) {
        details.push({
          index: step.index,
          skillName: step.skillName || '',
          count,
          expectedDamage: 0,
          totalDamage: 0,
          exhausted:     cleanNumber(toNumber(step.exhausted)),
          yishuiStacks:  cleanNumber(toNumber(step.yishuiStacks)),
          bengjieStacks: cleanNumber(toNumber(step.bengjieStacks)),
          error: step.skillName ? '未找到对应技能' : '技能名为空',
        })
        return
      }

      const stepBonus = resolveStepBonuses(
        step,
        ctx.selectedSet    || '',
        ctx.selectedMentalities || [],
        ctx.bonusMap
      )

      const result = calculateSkillResult(skill, {
        exhausted:     cleanNumber(toNumber(step.exhausted)),
        yishuiStacks:  cleanNumber(toNumber(step.yishuiStacks)),
        bengjieStacks: cleanNumber(toNumber(step.bengjieStacks)),
        lowEnergy:     cleanNumber(toNumber(step.lowEnergy)),
        hasYishui,
        hasBengjie,
        stepBonus,
        step,
      }, formOverride)

      // 鼠鼠窗口累积
      if (step.skillName === '90鼠鼠泥鱼') {
        shushuAccumulator = cleanNumber(shushuAccumulator + result.expectedDamage * count);
      }


      // 尘伞窗口累积
      const bonusFields    = ['bonus1', 'bonus2', 'bonus3', 'bonus4', 'bonus5', 'bonus6', 'bonus7'];
      const hasShihunLuopo = bonusFields.some(k => step[k] === '失魂落魄');
      if (hasShihunLuopo) {
        chenSanAccumulator = cleanNumber(chenSanAccumulator + result.expectedDamage * count);
      }

      // 结算技能
      let finalExpectedDamage = result.expectedDamage

      if (step.skillName === '鼠鼠结算') {
        finalExpectedDamage = cleanNumber(shushuAccumulator * 0.3 / (count || 1));
        shushuAccumulator   = 0;
      }
      if (step.skillName === '尘伞结算') {
        finalExpectedDamage = cleanNumber(chenSanAccumulator * 0.1 / (count || 1));
        chenSanAccumulator  = 0;
      }

      const totalDamage = cleanNumber(finalExpectedDamage * count);
      totalExpectedDamage = cleanNumber(totalExpectedDamage + totalDamage);

      details.push({
        index:         step.index,
        skillName:     step.skillName,
        count,
        exhausted:     cleanNumber(toNumber(step.exhausted), OUTPUT_PRECISION),
        yishuiStacks:  cleanNumber(toNumber(step.yishuiStacks), OUTPUT_PRECISION),
        bengjieStacks: cleanNumber(toNumber(step.bengjieStacks), OUTPUT_PRECISION),
        lowEnergy:     cleanNumber(toNumber(step.lowEnergy), OUTPUT_PRECISION),
        expectedDamage: cleanNumber(finalExpectedDamage, OUTPUT_PRECISION),
        totalDamage: cleanNumber(totalDamage, OUTPUT_PRECISION),
        finalInsightRate:  cleanNumber(result.finalInsightRate, OUTPUT_PRECISION),
        finalPerfectRate:  cleanNumber(result.finalPerfectRate, OUTPUT_PRECISION),
        glancingRate:      cleanNumber(result.glancingRate, OUTPUT_PRECISION),
        normalRate:        cleanNumber(result.normalRate, OUTPUT_PRECISION),
        insightProcRate:   cleanNumber(result.insightProcRate, OUTPUT_PRECISION),
        perfectProcRate:   cleanNumber(result.perfectProcRate, OUTPUT_PRECISION),
        totalDamageIncrease:        cleanNumber(result.totalDamageIncrease, OUTPUT_PRECISION),
        insightDamageBonus:         cleanNumber(result.insightDamageBonus, OUTPUT_PRECISION),
        perfectDamageBonus:         cleanNumber(result.perfectDamageBonus, OUTPUT_PRECISION),
        bossBonus:                  cleanNumber(result.bossBonus, OUTPUT_PRECISION),
        martialBoostDamageIncrease: cleanNumber(result.martialBoostDamageIncrease, OUTPUT_PRECISION),
        noteValue:                  cleanNumber(result.noteValue, OUTPUT_PRECISION),
        error: '',
      })
    })

    let duration = cleanNumber(toNumber(currentAxis.duration));
    if ((currentAxis.axisName || '').includes('气涌轴') && hasQianshanfa) {
      duration = cleanNumber(duration + 6);
    }

    const graduateDps  = cleanNumber(toNumber(currentAxis.graduateDps));
    const dps          = duration > 0 ? cleanNumber(totalExpectedDamage / duration) : 0;
    const graduateRate = graduateDps > 0 ? cleanNumber(dps / graduateDps) : 0;

    // 技能分类伤害聚合
    const skillSummaryMap = {}
    details.forEach(item => {
      if (item.error) return
      const name = item.skillName || '未知'
      if (!skillSummaryMap[name]) skillSummaryMap[name] = { skillName: name, totalDamage: 0 }
      skillSummaryMap[name].totalDamage = cleanNumber(
        skillSummaryMap[name].totalDamage + toNumber(item.totalDamage)
    )
  });
  const skillSummaryList = Object.values(skillSummaryMap)
  .map(item => ({
    skillName: item.skillName,
    totalDamage: cleanNumber(item.totalDamage, OUTPUT_PRECISION),
  }))
  .sort((a, b) => b.totalDamage - a.totalDamage);

    // 全局命中类型加权占比
    let weightedGlancing = 0, weightedNormal = 0, weightedInsight = 0, weightedPerfect = 0
    details.forEach(item => {
      if (item.error) return
      const w = cleanNumber(toNumber(item.totalDamage));
      weightedGlancing = cleanNumber(weightedGlancing + (item.glancingRate    || 0) * w);
      weightedNormal   = cleanNumber(weightedNormal   + (item.normalRate      || 0) * w);
      weightedInsight  = cleanNumber(weightedInsight  + (item.insightProcRate || 0) * w);
      weightedPerfect  = cleanNumber(weightedPerfect  + (item.perfectProcRate || 0) * w);
    });
    const weightTotal = cleanNumber(weightedGlancing + weightedNormal + weightedInsight + weightedPerfect);

    return {
      axisName:            currentAxis.axisName || '',
      schoolName:          currentAxis.schoolName || '',
      duration,
      graduateDps,
      totalExpectedDamage,
      dps,
      rawDps: dps,
      graduateRate,
      details,
      skillSummaryList,
      hitTypeStats: {
        glancingRate: weightTotal > 0 ? cleanNumber(weightedGlancing / weightTotal, OUTPUT_PRECISION) : 0,
        normalRate:   weightTotal > 0 ? cleanNumber(weightedNormal   / weightTotal, OUTPUT_PRECISION) : 0,
        insightRate:  weightTotal > 0 ? cleanNumber(weightedInsight  / weightTotal, OUTPUT_PRECISION) : 0,
        perfectRate:  weightTotal > 0 ? cleanNumber(weightedPerfect  / weightTotal, OUTPUT_PRECISION) : 0,
      },
      };
  }

  // ─────────────────────────────────────────────
  // 词条分析辅助
  // ─────────────────────────────────────────────

  /**
   * 根据词条定义，在原 form 基础上生成叠加后的覆盖 form。
   * 返回 null 表示该词条对当前流派无效，应跳过。
   */
  function buildOverrideForm(affix, form, currentSchool) {
    const f   = Object.assign({}, form)
    const n   = affix.name
    const max = toNumber(affix.max);
    const cv  = toNumber(affix.convert);

    const num = key => {
      const v = f[key]
      if (v === '' || v === undefined || v === null) return 0
      return cleanNumber(Number(String(v).replace('%', '')) || 0, FORM_PRECISION);
    }
    const set = (key, val) => { f[key] = cleanFormValue(val, FORM_PRECISION); };

    if (n === '劲') {
      set('physicalMaxAttack', num('physicalMaxAttack') + max * 1.36)
      set('physicalMinAttack', num('physicalMinAttack') + max * 0.225)
      return f
    }
    if (n === '敏') {
      set('physicalMinAttack', num('physicalMinAttack') + max * 0.9)
      set('insightRate', Math.min(num('insightRate') / 100 + max * 0.00076 * 0.77, 0.80) * 100)
      return f
    }
    if (n === '势') {
      set('physicalMaxAttack', num('physicalMaxAttack') + max * 0.9)
      set('perfectRate', Math.min(num('perfectRate') / 100 + max * 0.00038 * 0.77, 0.40) * 100)
      return f
    }
    if (n === '大外') { set('physicalMaxAttack', num('physicalMaxAttack') + max); return f }
    if (n === '小外') { set('physicalMinAttack', num('physicalMinAttack') + max); return f }
    if (n === '精准率') { set('precisionRate', num('precisionRate') + cv * 100); return f }
    if (n === '会心率') { set('insightRate', Math.min(num('insightRate') + cv * 100, 80)); return f }
    if (n === '会意率') { set('perfectRate', Math.min(num('perfectRate') + cv * 100, 40)); return f }
    if (n === '全部武学增效') {
      set('allMartialBonus', Math.min(num('allMartialBonus') + max * 100, max * 2 * 100))
      return f
    }
    if (n === '武学增效1') { set('martialBoostValue1', max * 100); return f }
    if (n === '武学增效2') { set('martialBoostValue2', max * 100); return f }
    if (n === '首领增伤') {
      set('bossBonus', Math.min(num('bossBonus') + max * 100, max * 2 * 100))
      return f
    }

    const roleMap = {
      单体爆发: 'singleBurstBonus', 单体控制: 'singleControlBonus',
      群体异常: 'groupAbnormalBonus', 群体伤害: 'groupDamageBonus',
    }
    if (roleMap[n]) {
      set(roleMap[n], Math.min(num(roleMap[n]) + max * 100, max * 2 * 100))
      return f
    }

    const dmgMap = {
      最小鸣金: 'mingjinMin', 最大鸣金: 'mingjinMax',
      最小裂石: 'lieshiMin',  最大裂石: 'lieshiMax',
      最小牵丝: 'qiansiMin',  最大牵丝: 'qiansiMax',
      最小破竹: 'pozhuMin',   最大破竹: 'pozhuMax',
    }
    if (dmgMap[n]) { set(dmgMap[n], num(dmgMap[n]) + max); return f }

    if (n === '外功穿透') {
      set('physicalPenetration', Math.min(num('physicalPenetration') + max, max * 4))
      return f
    }
    if (n === '属攻穿透') {
      const attrPenMap = { 鸣金: 'mingjinPen', 裂石: 'lieshiPen', 牵丝: 'qiansiPen', 破竹: 'pozhuPen' }
      const penKey     = attrPenMap[currentSchool.mainElement]
      if (!penKey) return null
      set(penKey, Math.min(num(penKey) + max, max * 4))
      return f
    }

    return null
  }

  /**
   * 传入覆盖后的 form，返回纯数字 DPS（不触发任何 setData）。
   */
  function calculateDpsWithForm(overrideForm) {
    try {
      const raw = calculateCurrentAxisResult(overrideForm);
      if (!raw) return null;
      return cleanNumber(raw.rawDps, OUTPUT_PRECISION);
    } catch (e) {
      return null;
    }
  }

  /**
   * 格式化词条满值用于展示。
   */
  function formatAffixMaxValue(affix) {
    const v = toNumber(affix.max);
    if (v < 1 && v > 0) {
      return (cleanNumber(v * 100, 6)).toFixed(3).replace(/\.?0+$/, '') + '%';
    }
    return String(cleanNumber(v, FORM_PRECISION));
  }

  /**
   * 格式化 DPS 数值用于展示。
   */
  function formatDpsValue(dps) {
    if (!dps || dps <= 0) return '—';
    return cleanNumber(dps, 6).toFixed(2);
  }

  // ─────────────────────────────────────────────
  // 公开接口
  // ─────────────────────────────────────────────
  return {
    // 工具
    toNumber,
    toPercent,
    clamp,
    format,
    normalizeRange,
    getAverage,
    getValueByMode,
    // 数据解析
    getElementConfig,
    getMainElementKeyBySchool,
    getMatchedNoteInfo,
    getMartialBoostDamageIncrease,
    getExtraDamageIncreaseBySkillType,
    resolveStepBonuses,
    getSkillByName,
    // 核心计算
    calcDamageByMode,
    calculateSkillResult,
    calculateCurrentAxisResult,
    // 词条分析
    buildOverrideForm,
    calculateDpsWithForm,
    formatAffixMaxValue,
    formatDpsValue,
  }
}

module.exports = { createCalculator }