// Copyright 2021 The Prometheus Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { parser } from 'lezer-promql';
import { styleTags, tags } from '@codemirror/highlight';
import { Extension } from '@codemirror/state';
import { CompleteConfiguration, CompleteStrategy, newCompleteStrategy } from './complete';
import { LintStrategy, newLintStrategy, promQLLinter } from './lint';
import { CompletionContext } from '@codemirror/autocomplete';
import { LezerLanguage } from '@codemirror/language';

export enum LanguageType {
  PromQL = 'PromQL',
  MetricName = 'MetricName',
}

export function promQLLanguage(top: LanguageType) {
  return LezerLanguage.define({
    parser: parser.configure({
      top: top,
      props: [
        styleTags({
          LineComment: tags.comment,
          LabelName: tags.labelName,
          StringLiteral: tags.string,
          NumberLiteral: tags.number,
          Duration: tags.number,
          'Abs Absent AbsentOverTime AvgOverTime Ceil Changes Clamp ClampMax ClampMin CountOverTime DaysInMonth DayOfMonth DayOfWeek Delta Deriv Exp Floor HistogramQuantile HoltWinters Hour Idelta Increase Irate LabelReplace LabelJoin LastOverTime Ln Log10 Log2 MaxOverTime MinOverTime Minute Month PredictLinear PresentOverTime QuantileOverTime Rate Resets Round Scalar Sgn Sort SortDesc Sqrt StddevOverTime StdvarOverTime SumOverTime Time Timestamp Vector Year': tags.function(
            tags.variableName
          ),
          'Avg Bottomk Count Count_values Group Max Min Quantile Stddev Stdvar Sum Topk': tags.operatorKeyword,
          'By Without Bool On Ignoring GroupLeft GroupRight Offset Start End': tags.modifier,
          'And Unless Or': tags.logicOperator,
          'Sub Add Mul Mod Div Eql Neq Lte Lss Gte Gtr EqlRegex EqlSingle NeqRegex Pow At': tags.operator,
          UnaryOp: tags.arithmeticOperator,
          '( )': tags.paren,
          '[ ]': tags.squareBracket,
          '{ }': tags.brace,
          '⚠': tags.invalid,
        }),
      ],
    }),
    languageData: {
      closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`'] },
      commentTokens: { line: '#' },
    },
  });
}

/**
 * This class holds the state of the completion extension for CodeMirror and allow hot-swapping the complete strategy.
 */
export class PromQLExtension {
  private complete: CompleteStrategy;
  private lint: LintStrategy;
  private enableCompletion: boolean;
  private enableLinter: boolean;

  constructor() {
    this.complete = newCompleteStrategy();
    this.lint = newLintStrategy();
    this.enableLinter = true;
    this.enableCompletion = true;
  }

  setComplete(conf?: CompleteConfiguration): PromQLExtension {
    this.complete = newCompleteStrategy(conf);
    return this;
  }

  getComplete(): CompleteStrategy {
    return this.complete;
  }

  activateCompletion(activate: boolean): PromQLExtension {
    this.enableCompletion = activate;
    return this;
  }

  setLinter(linter: LintStrategy): PromQLExtension {
    this.lint = linter;
    return this;
  }

  getLinter(): LintStrategy {
    return this.lint;
  }

  activateLinter(activate: boolean): PromQLExtension {
    this.enableLinter = activate;
    return this;
  }

  asExtension(languageType = LanguageType.PromQL): Extension {
    const language = promQLLanguage(languageType);
    let extension: Extension = [language];
    if (this.enableCompletion) {
      const completion = language.data.of({
        autocomplete: (context: CompletionContext) => {
          return this.complete.promQL(context);
        },
      });
      extension = extension.concat(completion);
    }
    if (this.enableLinter) {
      extension = extension.concat(promQLLinter(this.lint.promQL, this.lint));
    }
    return extension;
  }
}
