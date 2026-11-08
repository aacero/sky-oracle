import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { Window } from 'happy-dom';
import { t } from './i18n.ts';
import { renderDraggableDashboardCards } from '../ui/dashboard-cards.ts';

const mainFilePath = path.resolve(__dirname, '../main.ts');
const mainSrc = fs.readFileSync(mainFilePath, 'utf8');
const sourceFile = ts.createSourceFile('src/main.ts', mainSrc, ts.ScriptTarget.Latest, true);

const uiDirPath = path.resolve(__dirname, '../ui');
const uiSourceFiles: ts.SourceFile[] = fs.existsSync(uiDirPath)
  ? fs
      .readdirSync(uiDirPath)
      .filter(f => f.endsWith('.ts'))
      .map(f => {
        const full = path.resolve(uiDirPath, f);
        return ts.createSourceFile(`src/ui/${f}`, fs.readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true);
      })
  : [];

const allSourceFiles: ts.SourceFile[] = [sourceFile, ...uiSourceFiles];

// ── AST & Template Extraction Utilities ─────────────────────────────────────

function findFunction(name: string): ts.FunctionDeclaration | null {
  let result: ts.FunctionDeclaration | null = null;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.name.text === name) {
      result = node;
    }
    ts.forEachChild(node, visit);
  }
  for (const sf of allSourceFiles) {
    visit(sf);
    if (result) break;
  }
  return result;
}

function getTemplateNodes(node: ts.Node): (ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral)[] {
  const templates: (ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral)[] = [];
  function visit(n: ts.Node) {
    if (ts.isTemplateExpression(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      templates.push(n);
    }
    ts.forEachChild(n, visit);
  }
  visit(node);
  return templates;
}

/**
 * Reconstructs a full sample HTML document from a TypeScript AST template node,
 * recursively expanding sub-templates, conditionals, and map returns.
 */
function reconstructHtml(node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral): string {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  let result = node.head.text;
  for (const span of node.templateSpans) {
    const expr = span.expression;
    let exprHtml = '';

    if (ts.isTemplateExpression(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      exprHtml = reconstructHtml(expr);
    } else if (ts.isConditionalExpression(expr)) {
      const trueHtml = ts.isTemplateExpression(expr.whenTrue) || ts.isNoSubstitutionTemplateLiteral(expr.whenTrue)
        ? reconstructHtml(expr.whenTrue)
        : '';
      const falseHtml = ts.isTemplateExpression(expr.whenFalse) || ts.isNoSubstitutionTemplateLiteral(expr.whenFalse)
        ? reconstructHtml(expr.whenFalse)
        : '';
      if (trueHtml || falseHtml) {
        exprHtml = trueHtml + (trueHtml && falseHtml ? '\n' : '') + falseHtml;
      } else {
        const sf = expr.getSourceFile();
        const text = expr.whenFalse.getText(sf) || expr.whenTrue.getText(sf);
        const m = text.match(/t\(['"]([^'"]+)['"]\)/);
        if (m) exprHtml = t(m[1] as any);
      }
    } else if (ts.isCallExpression(expr)) {
      const sf = expr.getSourceFile();
      const text = expr.getText(sf);
      if (text.includes('renderDraggableDashboardCards')) {
        const cardFns = ['renderMoonCard', 'renderSunCard', 'renderPlanetsCard', 'renderMeteorShowerCard'];
        exprHtml = cardFns
          .map(fnName => {
            const fn = findFunction(fnName);
            if (!fn) return '';
            const tpls = getTemplateNodes(fn);
            return tpls.length > 0 ? reconstructHtml(tpls[0]) : '';
          })
          .join('\n');
      } else if (text.includes('renderDragHandle')) {
        const fn = findFunction('renderDragHandle');
        if (fn) {
          const tpls = getTemplateNodes(fn);
          if (tpls.length > 0) exprHtml = reconstructHtml(tpls[0]);
        }
      } else if (text.includes('renderMeteorShowerCard')) {
        const meteorNode = findFunction('renderMeteorShowerCard');
        if (meteorNode) {
          const tpls = getTemplateNodes(meteorNode);
          if (tpls.length > 0) exprHtml = reconstructHtml(tpls[0]);
        }
      } else if (text.includes("t('") || text.includes('t("')) {
        const m = text.match(/t\(['"]([^'"]+)['"]\)/);
        if (m) {
          const val = t(m[1] as any);
          exprHtml = text.includes('toUpperCase()') ? val.toUpperCase() : val;
        }
      } else {
        expr.forEachChild(arg => {
          if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
            const body = arg.body;
            if (ts.isTemplateExpression(body) || ts.isNoSubstitutionTemplateLiteral(body)) {
              exprHtml = reconstructHtml(body);
            }
          }
        });
      }
    }
    result += exprHtml + span.literal.text;
  }
  return result;
}

// ── Strict HTML Tag Balancer ────────────────────────────────────────────────

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const SVG_SELF_CLOSING = new Set([
  'path', 'circle', 'line', 'rect', 'ellipse', 'polygon', 'polyline', 'use', 'stop'
]);

interface TagStackItem {
  tagName: string;
  pos: number;
}

function validateStrictHtmlBalance(html: string, contextName: string): boolean {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*?)(\/?)>/g;
  const stack: TagStackItem[] = [];
  let m: RegExpExecArray | null;

  while ((m = tagRegex.exec(clean)) !== null) {
    const full = m[0];
    const tagName = m[1].toLowerCase();
    const attrs = m[2];
    const isSelfClosing = m[3] === '/' || VOID_TAGS.has(tagName) || (SVG_SELF_CLOSING.has(tagName) && (attrs.trim().endsWith('/') || m[3] === '/'));
    const isClosing = full.startsWith('</');

    if (isClosing) {
      if (VOID_TAGS.has(tagName)) {
        throw new Error(`${contextName}: Void tag </${tagName}> should never have a closing tag at index ${m.index}`);
      }
      if (stack.length === 0) {
        throw new Error(`${contextName}: Stray closing tag </${tagName}> found with empty stack at index ${m.index}`);
      }
      const last = stack.pop()!;
      if (last.tagName !== tagName) {
        throw new Error(
          `${contextName}: Mismatched closing tag </${tagName}> at index ${m.index}. Expected </${last.tagName}> (opened at ${last.pos}).`
        );
      }
    } else if (!isSelfClosing) {
      stack.push({ tagName, pos: m.index });
    }
  }

  if (stack.length > 0) {
    const unclosed = stack.map(s => `<${s.tagName}> (index ${s.pos})`).join(', ');
    throw new Error(`${contextName}: Unclosed HTML tags remaining at end of template: ${unclosed}`);
  }

  return true;
}

// ── Test Suites ─────────────────────────────────────────────────────────────

describe('Document Structure & Layout Regressions', () => {

  describe('Strict Template HTML Syntax & Tag Balancing', () => {
    it('validates render() root layout has 100% balanced HTML tags', () => {
      const fnNode = findFunction('render');
      expect(fnNode).not.toBeNull();
      const tpls = getTemplateNodes(fnNode!);
      expect(tpls.length).toBeGreaterThan(0);
      const html = reconstructHtml(tpls[0]);
      expect(validateStrictHtmlBalance(html, 'render()')).toBe(true);
    });

    it('validates renderPlanetModal() has 100% balanced HTML tags', () => {
      const fnNode = findFunction('renderPlanetModal');
      expect(fnNode).not.toBeNull();
      const tpls = getTemplateNodes(fnNode!);
      expect(tpls.length).toBeGreaterThan(0);
      const html = reconstructHtml(tpls[0]);
      expect(validateStrictHtmlBalance(html, 'renderPlanetModal()')).toBe(true);
    });

    it('validates renderTourModal() has 100% balanced HTML tags', () => {
      const fnNode = findFunction('renderTourModal');
      expect(fnNode).not.toBeNull();
      const tpls = getTemplateNodes(fnNode!);
      expect(tpls.length).toBeGreaterThan(0);
      const html = reconstructHtml(tpls[0]);
      expect(validateStrictHtmlBalance(html, 'renderTourModal()')).toBe(true);
    });

    it('validates renderMeteorShowerCard() has 100% balanced HTML tags', () => {
      const fnNode = findFunction('renderMeteorShowerCard');
      expect(fnNode).not.toBeNull();
      const tpls = getTemplateNodes(fnNode!);
      expect(tpls.length).toBeGreaterThan(0);
      const html = reconstructHtml(tpls[0]);
      expect(validateStrictHtmlBalance(html, 'renderMeteorShowerCard()')).toBe(true);
    });

    it('validates renderMoonCard(), renderSunCard(), and renderPlanetsCard() have 100% balanced HTML tags', () => {
      for (const fnName of ['renderMoonCard', 'renderSunCard', 'renderPlanetsCard']) {
        const fnNode = findFunction(fnName);
        expect(fnNode, `${fnName} not found`).not.toBeNull();
        const tpls = getTemplateNodes(fnNode!);
        expect(tpls.length).toBeGreaterThan(0);
        const html = reconstructHtml(tpls[0]);
        expect(validateStrictHtmlBalance(html, `${fnName}()` )).toBe(true);
      }
    });

    it('validates renderSearchModal() has 100% balanced HTML tags', () => {
      const fnNode = findFunction('renderSearchModal');
      expect(fnNode).not.toBeNull();
      const tpls = getTemplateNodes(fnNode!);
      expect(tpls.length).toBeGreaterThan(0);
      const html = reconstructHtml(tpls[0]);
      expect(validateStrictHtmlBalance(html, 'renderSearchModal()')).toBe(true);
    });

    it('negative test: tag validator correctly detects stray </div> tags (simulating modal split layout bug)', () => {
      const fnNode = findFunction('renderPlanetModal')!;
      const html = reconstructHtml(getTemplateNodes(fnNode)[0]);
      // Introduce an intentional stray </div> before the modal body
      const brokenHtml = html.replace('<div class="planet-modal-body', '</div><div class="planet-modal-body');
      expect(() => validateStrictHtmlBalance(brokenHtml, 'brokenPlanetModal')).toThrow(/Mismatched closing tag|Stray closing tag|Unclosed HTML tags/);
    });
  });

  describe('Modal Hierarchy & Containment Invariants', () => {
    it('ensures #planetModalOverlay has exactly 1 top-level modal dialog container', () => {
      const fnNode = findFunction('renderPlanetModal')!;
      const html = reconstructHtml(getTemplateNodes(fnNode)[0]);
      const win = new Window();
      win.document.body.innerHTML = html;

      const overlay = win.document.getElementById('planetModalOverlay');
      expect(overlay).not.toBeNull();
      // Overlay must contain exactly 1 card child to prevent horizontal side-by-side flex split
      expect(overlay!.children.length).toBe(1);

      const content = overlay!.querySelector('.planet-modal-content');
      expect(content).not.toBeNull();

      const body = overlay!.querySelector('.planet-modal-body');
      expect(body).not.toBeNull();
      // .planet-modal-body must be nested inside .planet-modal-content, NOT a sibling of it
      expect(content!.contains(body!)).toBe(true);
      expect(body!.parentElement).toBe(content);
    });

    it('ensures #tourModalOverlay has exactly 1 dialog container with controls', () => {
      const fnNode = findFunction('renderTourModal')!;
      const html = reconstructHtml(getTemplateNodes(fnNode)[0]);
      const win = new Window();
      win.document.body.innerHTML = html;

      const overlay = win.document.getElementById('tourModalOverlay');
      expect(overlay).not.toBeNull();
      expect(overlay!.children.length).toBe(1);

      expect(win.document.getElementById('btnCloseTourModal')).not.toBeNull();
      expect(win.document.getElementById('btnTourPrev')).not.toBeNull();
      expect(win.document.getElementById('btnTourNext')).not.toBeNull();
    });
  });

  describe('Main Page Card Order & Independent Draggable Cards Invariants', () => {
    it('enforces the default card order: Hero Verdict (pinned) -> Moon -> Sun -> Solar System Targets -> Meteor Showers', () => {
      const fnNode = findFunction('render')!;
      const html = reconstructHtml(getTemplateNodes(fnNode)[0]);
      const win = new Window();
      win.document.body.innerHTML = html;

      const main = win.document.querySelector('main');
      expect(main).not.toBeNull();
      const mainChildren = Array.from(main!.children);

      // Section 0: Hero Verdict & Observing Window (pinned on top, no drag handle)
      const heroSection = mainChildren[0];
      expect(heroSection.tagName.toLowerCase()).toBe('section');
      expect(heroSection.textContent).toMatch(/OBSERVING WINDOW|TONIGHT/i);
      expect(heroSection.getAttribute('data-card-id')).toBeNull();
      expect(heroSection.querySelector('.card-drag-handle')).toBeNull();

      // Section 1: Moon Ephemeris card (independently draggable)
      const moonSection = mainChildren[1];
      expect(moonSection.tagName.toLowerCase()).toBe('section');
      expect(moonSection.getAttribute('data-card-id')).toBe('moon');
      expect(moonSection.querySelector('.card-drag-handle')).not.toBeNull();

      // Section 2: Sun & Twilight card (independently draggable)
      const sunSection = mainChildren[2];
      expect(sunSection.tagName.toLowerCase()).toBe('section');
      expect(sunSection.getAttribute('data-card-id')).toBe('sun');
      expect(sunSection.querySelector('.card-drag-handle')).not.toBeNull();

      // Section 3: Solar System Targets card (Planet Table, independently draggable)
      const planetSection = mainChildren[3];
      expect(planetSection.tagName.toLowerCase()).toBe('section');
      expect(planetSection.getAttribute('data-card-id')).toBe('planets');
      expect(planetSection.textContent).toMatch(/SOLAR SYSTEM TARGETS/i);
      expect(planetSection.querySelector('.card-drag-handle')).not.toBeNull();

      // Section 4: Meteor Showers card (independently draggable)
      const meteorSection = mainChildren[4];
      expect(meteorSection.tagName.toLowerCase()).toBe('section');
      expect(meteorSection.getAttribute('data-card-id')).toBe('meteors');
      expect(meteorSection.textContent).toMatch(/METEOR SHOWERS/i);
      expect(meteorSection.querySelector('.card-drag-handle')).not.toBeNull();
    });

    it('dynamically reorders the 4 draggable cards and adapts Moon/Sun column spans when separated', () => {
      const dummyMeteor = {
        primaryShower: null,
        otherActiveShowers: [],
        nextUpcomingShower: null
      };

      // Case 1: Moon and Sun separated by Planets -> both Moon and Sun expand to md:col-span-2
      const separatedHtml = renderDraggableDashboardCards(
        ['moon', 'planets', 'sun', 'meteors'],
        null,
        null,
        [],
        dummyMeteor
      );
      const winSep = new Window();
      winSep.document.body.innerHTML = separatedHtml;
      const sepSections = Array.from(winSep.document.querySelectorAll('section[data-card-id]'));
      expect(sepSections.map(s => s.getAttribute('data-card-id'))).toEqual([
        'moon',
        'planets',
        'sun',
        'meteors'
      ]);
      expect(sepSections[0].className).toContain('md:col-span-2');
      expect(sepSections[2].className).toContain('md:col-span-2');

      // Case 2: Sun and Moon adjacent (swapped) -> both use md:col-span-1 side-by-side
      const adjacentHtml = renderDraggableDashboardCards(
        ['planets', 'sun', 'moon', 'meteors'],
        null,
        null,
        [],
        dummyMeteor
      );
      const winAdj = new Window();
      winAdj.document.body.innerHTML = adjacentHtml;
      const adjSections = Array.from(winAdj.document.querySelectorAll('section[data-card-id]'));
      expect(adjSections.map(s => s.getAttribute('data-card-id'))).toEqual([
        'planets',
        'sun',
        'moon',
        'meteors'
      ]);
      expect(adjSections[1].className).toContain('md:col-span-1');
      expect(adjSections[2].className).toContain('md:col-span-1');
    });
  });

  describe('Responsive Tour CTA & Mobile Button Visibility', () => {
    it('ensures the Tour button #btnOpenTour is prominently placed in the Hero card and not hidden on mobile', () => {
      const fnNode = findFunction('render')!;
      const html = reconstructHtml(getTemplateNodes(fnNode)[0]);
      const win = new Window();
      win.document.body.innerHTML = html;

      const tourBtn = win.document.getElementById('btnOpenTour');
      expect(tourBtn).not.toBeNull();

      // Must be inside the hero card section
      const main = win.document.querySelector('main')!;
      const heroSection = main.children[0];
      expect(heroSection.contains(tourBtn!)).toBe(true);

      // Must NOT have classes that hide its text label on mobile screens
      const btnClass = tourBtn!.className || '';
      expect(btnClass).not.toMatch(/hidden\s+md:inline/);
      expect(btnClass).not.toMatch(/hidden\s+sm:inline/);

      const labelSpans = Array.from(tourBtn!.querySelectorAll('span'));
      for (const span of labelSpans) {
        const spanClass = span.className || '';
        expect(spanClass).not.toMatch(/hidden\s+md:inline/);
        expect(spanClass).not.toMatch(/hidden\s+sm:inline/);
      }

      // Must have an informative tooltip/title
      expect(tourBtn!.getAttribute('title')).toBeTruthy();
    });

    it('ensures Fullscreen toggle #btnToggleFullscreen exists with accessible labels', () => {
      const fnNode = findFunction('render')!;
      const html = reconstructHtml(getTemplateNodes(fnNode)[0]);
      const win = new Window();
      win.document.body.innerHTML = html;

      const btn = win.document.getElementById('btnToggleFullscreen');
      expect(btn).not.toBeNull();
      expect(btn!.getAttribute('title')).toBeTruthy();
      expect(btn!.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Event Handler Binding Parity', () => {
    it('verifies that all critical button IDs in attachEventHandlers() exist in the templates', () => {
      const attachFn = findFunction('attachEventHandlers');
      expect(attachFn).not.toBeNull();
      const fnText = attachFn!.getText(sourceFile);

      // Find all getElementById calls
      const idMatches = Array.from(fnText.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g));
      const boundIds = Array.from(new Set(idMatches.map(m => m[1])));

      // Render templates
      const win = new Window();
      const renderNode = findFunction('render')!;
      const planetNode = findFunction('renderPlanetModal')!;
      const tourNode = findFunction('renderTourModal')!;
      const searchNode = findFunction('renderSearchModal')!;

      const fullHtml = [
        reconstructHtml(getTemplateNodes(renderNode)[0]),
        reconstructHtml(getTemplateNodes(planetNode)[0]),
        reconstructHtml(getTemplateNodes(tourNode)[0]),
        reconstructHtml(getTemplateNodes(searchNode)[0])
      ].join('\n');

      win.document.body.innerHTML = fullHtml;

      // Ensure every bound ID exists in the DOM
      for (const id of boundIds) {
        const el = win.document.getElementById(id);
        expect(el, `Expected element with id="${id}" to exist in rendered templates`).not.toBeNull();
      }
    });
  });

});
