'use client';

import { useState, useMemo, use } from 'react';
import { 
  Search, HelpCircle, ArrowLeft, ArrowRight, Shield, Globe, 
  Keyboard, Eye, Terminal, BookOpen, Layers, Zap, Info,
  MousePointer2, Settings, Users, Key, Monitor, Activity, CheckCircle,
  Mail, MessageSquare, Database, FileText, CheckSquare, Bot, Play, Square,
  GitFork, RefreshCw, Sliders, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

/* ─────────────────────── TYPES ─────────────────────── */
interface NodeDetail {
  type: string;
  category: 'basic' | 'logic' | 'data' | 'integration' | 'human' | 'ai' | 'board';
  iconName: string;
  en: {
    label: string;
    description: string;
    properties: string[];
    benefits: string;
    accessibility: string;
  };
  ar: {
    label: string;
    description: string;
    properties: string[];
    benefits: string;
    accessibility: string;
  };
}

interface ArticleDetail {
  id: string;
  iconName: string;
  en: {
    title: string;
    description: string;
    steps: string[];
  };
  ar: {
    title: string;
    description: string;
    steps: string[];
  };
}

/* ─────────────────────── HELP CONTENT TRANSLATIONS ─────────────────────── */
const SYSTEM_ARTICLES: ArticleDetail[] = [
  {
    id: 'canvas_editor',
    iconName: 'Layers',
    en: {
      title: 'Workflow Canvas Editor',
      description: 'Design and deploy automated workflow layouts using our drag-and-drop ReactFlow builder canvas.',
      steps: [
        'Open the library sidebar on the left to browse available basic, logic, integration, data, human, or AI steps.',
        'Drag any step onto the canvas. A custom node representing the step will mount with preconfigured inputs/outputs.',
        'Connect handles together by dragging a wire from the outgoing handle of a node to the incoming handle of another.',
        'Double-click any node to open the Right Properties Panel to adjust values, customize logic expressions, or configure API links.',
        'Auto-save secures your progress in the background. Press "Undo" (Ctrl+Z) or "Redo" (Ctrl+Y) to navigate editing states.'
      ]
    },
    ar: {
      title: 'محرر لوحة العمل التفاعلية',
      description: 'صمم وانشر مخططات تدفق العمل المؤتمتة باستخدام لوحة المحرر القائمة على السحب والإفلات.',
      steps: [
        'افتح الشريط الجانبي للمكتبة من اليسار لتصفح الخطوات المتاحة (الأساسية، المنطق، الربط، البيانات، البشرية، أو الذكاء الاصطناعي).',
        'اسحب أي خطوة وأفلتها في اللوحة. سيتم إنشاء عقدة مخصصة بالمدخلات والمخرجات المهيأة مسبقاً.',
        'اربط المقابض معاً بسحب سلك اتصال من مقبض المخرجات في عقدة ما إلى مقبض المدخلات في عقدة أخرى.',
        'انقر نقراً مزدوجاً على أي عقدة لفتح لوحة الخصائص الجانبية لتعديل القيم، كتابة التعبيرات المنطقية، أو تهيئة واجهات البرمجة.',
        'يعمل الحفظ التلقائي على تأمين تقدمك في الخلفية. اضغط على تراجع (Ctrl+Z) أو إعادة (Ctrl+Y) للتنقل في سجل التعديلات.'
      ]
    }
  },
  {
    id: 'board_node',
    iconName: 'Zap',
    en: {
      title: 'Collaborative Whiteboard Node',
      description: 'A robust canvas within canvas node that turns a workflow step into a full-featured real-time brainstorming space.',
      steps: [
        'Double click any Board Node on your canvas, then click the "Open Board Canvas" to scale the whiteboard layer.',
        'Use the Left Toolbar to select your brush tool: Pen for freehand, Line/Arrow for vectors, Rectangle/Circle/Triangle for shapes, and Text for captions.',
        'Change visual styling inside the Right Panel: adjust border stroke width, customize active color palletes, and enable solid block colors.',
        'If a shape is already drawn, switch to the "Select" tool, click the shape, and dynamically adjust its colors, sizes, or delete it.',
        'Strokes and shapes synchronize instantly across collaborator sessions without lag. The system streams combined cursor pointers in real time.'
      ]
    },
    ar: {
      title: 'عقدة لوحة البيضاء التشاركية',
      description: 'لوحة متكاملة داخل عقدة تحوّل خطوة سير العمل إلى مساحة عصف ذهني كاملة الميزات وتشاركية فورية.',
      steps: [
        'انقر نقراً مزدوجاً على أي عقدة لوحة بيضاء في لوحتك، ثم انقر على زر "فتح اللوحة" لتكبير طبقة الرسم.',
        'استخدم شريط الأدوات الأيسر لاختيار أداة الرسم: القلم للرسم الحر، الخط/السهم للمتجهات، المستطيل/الدائرة/المثلث للأشكال، والنص للعناوين.',
        'عدّل الأنماط المرئية في اللوحة اليمنى: اضبط سمك الخط، اختر لوحة الألوان النشطة، وفعّل خيار تعبئة الأشكال الصلبة.',
        'إذا كان الشكل مرسوماً بالفعل، فقم بالتحويل إلى أداة "التحديد"، وانقر على الشكل، لتعديل ألوانه وأحجامه ديناميكياً أو حذفه.',
        'تتزامن الخطوط والأشكال فوراً عبر جميع جلسات المتعاونين النشطة، حيث يقوم النظام بنقل مؤشرات الحركة في الوقت الفعلي.'
      ]
    }
  },
  {
    id: 'sharing_collab',
    iconName: 'Users',
    en: {
      title: 'Workspaces & Collaborator Invites',
      description: 'Manage security scopes, invite partners, and govern permissions for visual flows securely.',
      steps: [
        'Workspace Owners can click "Workspace Settings" in the sidebar or in the profile dropdown menu.',
        'Go to the "Members & Sharing" tab. Under "Workspace Share Links", enter a custom label and assign a default auto-join role.',
        'Copy the generated share link token and share it with your team. They can log in and click Join to enter the workspace.',
        'The Workspace Members card lists all partners, displaying their roles (Admin, Editor, Commenter, Viewer) and join dates.',
        'Owners can modify collaborator roles on the fly using dropdown role selectors, or securely remove members with a single click.'
      ]
    },
    ar: {
      title: 'مساحات العمل ودعوات المتعاونين',
      description: 'إدارة الصلاحيات الأمنية، دعوة الشركاء، وحوكمة حقوق الوصول لمخططات العمل بشكل آمن.',
      steps: [
        'يمكن لمالكي مساحة العمل النقر فوق "إعدادات مساحة العمل" في الشريط الجانبي أو في قائمة الملف الشخصي العلوية.',
        'انتقل إلى علامة التبويب "الأعضاء والمشاركة". تحت "روابط دعوة مساحة العمل"، أدخل تسمية مخصصة وعيّن دور الانضمام الافتراضي.',
        'انسخ رابط المشاركة الناتج وشاركه مع فريقك. يمكنهم تسجيل الدخول والنقر فوق انضمام لدخول مساحة العمل.',
        'تعرض بطاقة أعضاء مساحة العمل جميع المتعاونين مع أدوارهم (مشاهد، معلق، محرر، مدير) وتواريخ انضمامهم.',
        'يمكن للمالكين تعديل أدوار المتعاونين فوراً باستخدام قوائم تحديد الأدوار، أو إزالتهم بأمان بنقرة واحدة.'
      ]
    }
  }
];

const NODE_CATALOG: NodeDetail[] = [
  // --- 0. Board ---
  {
    type: 'board',
    category: 'board',
    iconName: 'Zap',
    en: {
      label: 'Whiteboard',
      description: 'Launch a full-featured collaborative drawing board within your workflow node, with rich shapes, lines, texts, and real-time syncing.',
      properties: ['Color presets', 'Background presets (Dark, Slate, Paper, etc.)', 'Stroke width (1px - 32px)', 'Use Solid Fill toggle'],
      benefits: 'Great for rapid interactive wireframing, architecture layouts, visual design, team notes, and real-time collaboration with teammates directly inside steps.',
      accessibility: 'Navigate select tool using "V" and brush tool using "P". Standard "Delete" key clears the currently highlighted canvas shape.'
    },
    ar: {
      label: 'اللوحة البيضاء التفاعلية',
      description: 'افتح لوحة رسم تشاركية متكاملة داخل عقدة سير العمل، مع أشكال غنية، خطوط، نصوص، ومزامنة فورية كاملة.',
      properties: ['مسبقات الألوان', 'مسبقات الخلفية (داكن، رمادي، ورقي، إلخ)', 'سمك الخط (1 بكسل - 32 بكسل)', 'تفعيل التعبئة الصلبة للأشكال'],
      benefits: 'مثالية للتخطيط الأولي التفاعلي السريع، وهندسة البنية التحتية، والتصاميم المرئية، والملاحظات الجماعية مباشرة داخل خطوة سير العمل.',
      accessibility: 'قم بالتنقل إلى أداة التحديد بالضغط على مفتاح "V" وأداة القلم بمفتاح "P". يتيح مفتاح "Delete" حذف الشكل المحدد حالياً.'
    }
  },
  // --- 1. Basic Nodes ---
  {
    type: 'start',
    category: 'basic',
    iconName: 'Play',
    en: {
      label: 'Start Trigger',
      description: 'Declares the initial event or HTTP webhook hook that triggers this workflow deployment.',
      properties: ['Trigger Source (API, Webhook, Schedule)', 'Authentication Method', 'Trigger Parameters JSON'],
      benefits: 'Serves as the vital entry point. Configuring strict JSON payload formats at the start ensures downstream nodes receive predictable, valid values.',
      accessibility: 'Fully focusable screen reader element with custom automated trigger status announcements.'
    },
    ar: {
      label: 'مشغل البدء',
      description: 'يحدد الحدث الأولي أو رابط Webhook الخارجي الذي يقوم بتشغيل وتنفيذ خطة سير العمل.',
      properties: ['مصدر المشغل (برمجي، مجدول، فوري)', 'طريقة المصادقة', 'معلمات المدخلات بتنسيق JSON'],
      benefits: 'يمثل نقطة الدخول الحيوية لسير العمل. يضمن تهيئة بنية البيانات المدخلة هنا حصول بقية العقد اللاحقة على قيم متوقعة وصالحة.',
      accessibility: 'عنصر قابل للتركيز بالكامل لقارئ الشاشة مع إعلانات آلية مخصصة لحالة التشغيل.'
    }
  },
  {
    type: 'process',
    category: 'basic',
    iconName: 'Activity',
    en: {
      label: 'Process Step',
      description: 'Executes a generic computational operation, script, or custom transform logic on active session values.',
      properties: ['Script Language (Javascript)', 'Function Body Code', 'Inputs / Outputs mappings'],
      benefits: 'Enables custom runtime formulas, variables adjustments, mathematical computations, and array slicing within workflows.',
      accessibility: 'Keyboard navigation enables syntax highlights editing using keyboard tab traps.'
    },
    ar: {
      label: 'خطوة معالجة البيانات',
      description: 'ينفذ عملية حوسبية عامة، نص برمجي، أو منطق تحويل مخصص على القيم النشطة في الجلسة.',
      properties: ['لغة البرمجة (جافا سكريبت)', 'كود جسم الوظيفة', 'تخطيط المدخلات والمخرجات'],
      benefits: 'يتيح تطبيق المعادلات المخصصة، وتعديل متغيرات سير العمل، والعمليات الرياضية المعقدة، والتحكم في المصفوفات.',
      accessibility: 'تتيح الملاحة بلوحة المفاتيح تحرير الكود البرمجي مع توفير ميزات التركيز الدقيق.'
    }
  },
  {
    type: 'decision',
    category: 'basic',
    iconName: 'HelpCircle',
    en: {
      label: 'Decision Node',
      description: 'Splits the execution path into True (Yes) and False (No) routes evaluating simple parameter conditions.',
      properties: ['Comparison Field A', 'Comparison Operator (Equals, Greater than, Contains)', 'Comparison Value B'],
      benefits: 'Enables binary logic flows. It routes execution safely depending on whether a field equals specific values or is not empty.',
      accessibility: 'Visual indicator colors (emerald/rose) have dedicated screen-reader text labels to assist color-blind editors.'
    },
    ar: {
      label: 'عقدة اتخاذ القرار',
      description: 'يقسم مسار التنفيذ إلى مسارين: صواب (نعم) أو خطأ (لا) بناءً على تقييم شروط المعلمات البسيطة.',
      properties: ['حقل المقارنة أ', 'معامل المقارنة (يساوي، أكبر من، يحتوي على)', 'حقل/قيمة المقارنة ب'],
      benefits: 'يمكّن تدفقات المنطق الثنائية. يوجه مسار التنفيذ بأمان اعتماداً على ما إذا كان الحقل المالي يساوي قيمة معينة أو ليس فارغاً.',
      accessibility: 'تحتوي ألوان المؤشر المرئي (الأخضر والأحمر) على تسميات نصية مخصصة لمساعدة المحررين الذين يعانون من صعوبة تمييز الألوان.'
    }
  },
  {
    type: 'delay',
    category: 'basic',
    iconName: 'Layers',
    en: {
      label: 'Delay Timer',
      description: 'Pauses the execution sequence for a set duration, schedule, or until a specific date.',
      properties: ['Delay Type (Duration, Target Date)', 'Duration Value (Hours, Days, Minutes)', 'Target Timestamp'],
      benefits: 'Essential for drip marketing campaigns, wait-intervals on signups, rate-limiting outbound email alerts, or awaiting updates.',
      accessibility: 'Screen readers read the remaining duration values dynamically during active debug sessions.'
    },
    ar: {
      label: 'مؤقت التأخير',
      description: 'يوقف تسلسل التنفيذ مؤقتاً لفترة زمنية محددة، أو حتى تاريخ ووقت معينين في المستقبل.',
      properties: ['نوع التأخير (فترة زمنية، تاريخ مستهدف)', 'قيمة المدة (أيام، ساعات، دقائق)', 'الطابع الزمني المستهدف'],
      benefits: 'ضروري لحملات التسويق المجزأة، وفترات الانتظار عند التسجيل، وتخفيف معدل إرسال البريد الإلكتروني، أو انتظار التحديثات.',
      accessibility: 'تقرأ قارئات الشاشة قيم المدة المتبقية ديناميكياً أثناء جلسات الفحص البرمجي النشطة.'
    }
  },
  {
    type: 'note',
    category: 'basic',
    iconName: 'FileText',
    en: {
      label: 'Canvas Note',
      description: 'Places custom text annotation boxes directly onto the workflow viewport canvas for comments and labels.',
      properties: ['Note Rich Text Markdown', 'Visual Theme Styles', 'Font Typography sizes'],
      benefits: 'Great for documenting workflow structures, noting todo actions, highlighting canvas regions, or presenting steps definitions to clients.',
      accessibility: 'Full keyboard tabs support. Focus allows swift editing of note contents using a text area control.'
    },
    ar: {
      label: 'ملاحظة اللوحة',
      description: 'يضع صناديق نصوص وتوضيحات مخصصة مباشرة على اللوحة لإضافة التعليقات والإشارات.',
      properties: ['نص الملاحظة بتنسيق Markdown', 'نمط السمة المرئية', 'حجم الخط والتنسيقات'],
      benefits: 'رائعة لتوثيق هياكل سير العمل، وتدوين المهام المطلوبة، أو شرح الخطوات لشركاء العمل والمستخدمين.',
      accessibility: 'دعم كامل للتنقل عبر مفتاح Tab. يتيح التركيز تعديلاً سريعاً لمحتوى الملاحظة عبر محرر نصوص مبسط.'
    }
  },
  {
    type: 'end',
    category: 'basic',
    iconName: 'Square',
    en: {
      label: 'End Step',
      description: 'Terminates the execution thread of a visual flow safely, storing final results or returning response objects.',
      properties: ['Output Payload JSON structure', 'Save Output History', 'Exit Status (Success, Fail)'],
      benefits: 'Guarantees workflows terminate cleanly, compiling structural results that downstream processes or webhooks can query.',
      accessibility: 'Announces flow execution ending statuses loudly for assistive readers.'
    },
    ar: {
      label: 'خطوة النهاية',
      description: 'ينهي مسار تنفيذ سير العمل المرئي بأمان، مع حفظ النتائج النهائية أو إرجاع استجابات مهيأة.',
      properties: ['هيكل بيانات المخرجات JSON', 'حفظ سجل المخرجات', 'حالة الخروج (نجاح، فشل)'],
      benefits: 'يضمن انتهاء سير العمل بشكل سليم، ويقوم بتجميع النتائج المنظمة التي يمكن للأنظمة الأخرى الاستعلام عنها.',
      accessibility: 'يعلن عن حالات انتهاء سير العمل بوضوح لمساعدي القراءة الصوتية.'
    }
  },
  // --- 2. Logic Nodes ---
  {
    type: 'if_else',
    category: 'logic',
    iconName: 'Globe',
    en: {
      label: 'If / Else',
      description: 'Branch paths by evaluating advanced multi-criteria expression logic statements.',
      properties: ['Criteria Rule Groupings', 'AND/OR combiners', 'Logical rules (is equal to, matches regex, exists)'],
      benefits: 'Supports highly complex flow segmentation. Ideal for routing users to premium vs free support pipelines or verifying multi-field data.',
      accessibility: 'Accessible keyboard controls allow toggling rule combiners and re-ordering logical groups without mouse clicks.'
    },
    ar: {
      label: 'شرط If / Else',
      description: 'توجيه المسارات عبر تقييم مجموعات متقدمة من التعبيرات المنطقية والشروط المتعددة.',
      properties: ['مجموعات قواعد الشرط', 'روابط منطقية (AND / OR)', 'القواعد (يساوي، يطابق التعبير النمطي، موجود)'],
      benefits: 'يدعم تقسيم التدفق شديد التعقيد. مثالي لتوجيه المستخدمين إلى قنوات دعم مختلفة بناءً على باقاتهم أو التحقق من البيانات.',
      accessibility: 'تتيح عناصر التحكم بلوحة المفاتيح تبديل الروابط المنطقية وإعادة ترتيب المجموعات دون استخدام الماوس.'
    }
  },
  {
    type: 'switch',
    category: 'logic',
    iconName: 'GitFork',
    en: {
      label: 'Switch Case',
      description: 'Routes workflow execution to multiple target paths matching custom key cases or string values.',
      properties: ['Evaluation Expression', 'Switch Target Values', 'Default Fallback Route'],
      benefits: 'Replaces messy chains of nested If/Else statements with a clean, high-performance visual routing hub.',
      accessibility: 'Fully navigable table view detailing cases, allowing users to re-order routes with simple keystrokes.'
    },
    ar: {
      label: 'توجيه الحالة Switch',
      description: 'يوجه تنفيذ سير العمل إلى مسارات متعددة تطابق حالات وقيم محددة للمتغير المستهدف.',
      properties: ['تعبير التقييم', 'قيم الحالات المستهدفة', 'المسار الافتراضي الاحتياطي'],
      benefits: 'يستبدل سلاسل شروط If/Else المتداخلة المربكة بمركز توجيه مرئي نظيف وعالي الأداء.',
      accessibility: 'جدول حالات قابل للتنقل بالكامل، يتيح للمستخدمين إعادة ترتيب المسارات باستخدام اختصارات بسيطة.'
    }
  },
  {
    type: 'loop',
    category: 'logic',
    iconName: 'Terminal',
    en: {
      label: 'For Loop',
      description: 'Iterates through an incoming array list, running sequence steps repeatedly for each item in the list.',
      properties: ['Target Array Variable', 'Iterator Name (item)', 'Max Iteration limit', 'Parallel Execution toggle'],
      benefits: 'Process batches of users, sync list entries to rows, or run calculations across arrays without manually duplicating steps.',
      accessibility: 'Loop limits are announced with strict security indicators to prevent infinite execution traps.'
    },
    ar: {
      label: 'حلقة تكرار Loop',
      description: 'يتكرر عبر مصفوفة مدخلة من البيانات، وينفذ خطوات محددة بشكل متكرر لكل عنصر في القائمة.',
      properties: ['المتغير المستهدف (المصفوفة)', 'اسم المتغير المكرر (العنصر)', 'الحد الأقصى للتكرار', 'التشغيل المتوازي للخطوات'],
      benefits: 'معالجة دفعات من المستخدمين، مزامنة عناصر القوائم مع صفوف قاعدة البيانات، أو إجراء العمليات الحسابية دون تكرار يدوي.',
      accessibility: 'يتم الإعلان عن حدود الحلقة مع مؤشرات أمان صارمة لمنع الوقوع في فخاخ التنفيذ اللانهائي.'
    }
  },
  {
    type: 'parallel',
    category: 'logic',
    iconName: 'Layers',
    en: {
      label: 'Parallel Split',
      description: 'Triggers multiple downstream execution paths concurrently, allowing async tasks to run at the same time.',
      properties: ['Parallel Paths list', 'Wait for All Paths flag', 'Merge logic parameters'],
      benefits: 'Saves time by dispatching notifications, updating databases, and fetching external data simultaneously instead of sequentially.',
      accessibility: 'Clear sequential layout maps so screen readers can track parallel flow threads without confusion.'
    },
    ar: {
      label: 'التقسيم المتوازي',
      description: 'يشغل مسارات متعددة في نفس الوقت، مما يسمح بتنفيذ المهام غير المتزامنة بالتوازي لتوفير الوقت.',
      properties: ['قائمة المسارات المتوازية', 'خيار انتظار اكتمال الكل', 'منطق دمج المسارات'],
      benefits: 'يوفر الوقت بشكل كبير عن طريق إرسال الإشعارات، وتحديث البيانات، وجلب المعلومات الخارجية في آن واحد.',
      accessibility: 'تخطيط تسلسلي واضح يتيح لقارئات الشاشة تتبع خيوط التنفيذ المتوازية دون تشويش.'
    }
  },
  {
    type: 'merge',
    category: 'logic',
    iconName: 'GitFork',
    en: {
      label: 'Merge Paths',
      description: 'Combines multiple parallel execution paths back into a single workflow thread.',
      properties: ['Incoming Nodes list', 'Merge Condition (All, Any, Custom Formula)', 'Payload Combination strategy'],
      benefits: 'Syncs concurrent branches cleanly, ensuring downstream operations only execute once upstream branches settle.',
      accessibility: 'Accessible logic labels displaying the node state visually and verbally during runtime checks.'
    },
    ar: {
      label: 'دمج المسارات',
      description: 'يجمع مسارات تنفيذ متوازية متعددة ويعيدها إلى مسار فردي موحد لسير العمل.',
      properties: ['قائمة العقد الواردة', 'شرط الدمج (الكل، أي منها، معادلة مخصصة)', 'استراتيجية دمج البيانات'],
      benefits: 'يزامن الفروع المتوازية بشكل نظيف، مما يضمن عدم تشغيل الخطوات اللاحقة إلا بعد استقرار المسارات السابقة.',
      accessibility: 'تسميات منطقية واضحة تعرض حالة العقدة مرئياً ولفظياً للمستخدمين أثناء التدقيق.'
    }
  },
  {
    type: 'retry',
    category: 'logic',
    iconName: 'RefreshCw',
    en: {
      label: 'Retry Block',
      description: 'Attempts to re-execute failing operations under this node for a specific count using delay strategies.',
      properties: ['Max Retry attempts', 'Backoff Strategy (Linear, Exponential)', 'Interval Seconds', 'Error codes whitelist'],
      benefits: 'Protects workflows against transient network glitches, API drops, or temporary database locking problems.',
      accessibility: 'Detailed logs are read by screen readers to alert editors of active attempts and backoff pauses.'
    },
    ar: {
      label: 'كتلة إعادة المحاولة',
      description: 'تحاول إعادة تنفيذ العمليات المتعثرة تحت هذه العقدة لعدد محدد من المرات بناءً على استراتيجيات تأخير.',
      properties: ['الحد الأقصى للمحاولات', 'استراتيجية التأخير (خطي، أسي)', 'الفترة الزمنية بالثواني', 'قائمة الأخطاء المستهدفة'],
      benefits: 'يحمي تدفقات العمل من مشاكل الشبكة المؤقتة، أو تعطل الخدمات الخارجية، أو قفل قاعدة البيانات العابر.',
      accessibility: 'تتم قراءة سجلات التفاصيل بواسطة قارئات الشاشة لتنبيه المطورين بالمحاولات الجارية وفترات الانتظار.'
    }
  },
  // --- 3. Data Nodes ---
  {
    type: 'input',
    category: 'data',
    iconName: 'Sliders',
    en: {
      label: 'JSON Input',
      description: 'Defines the schema structure and custom key boundaries of active incoming variables.',
      properties: ['Schema Fields (Key, Type, Required)', 'Validation Rules', 'Sample JSON payload'],
      benefits: 'Enforces type-safety. Downstream execution can reliably parse parameters, protecting fields against null or missing exceptions.',
      accessibility: 'Dynamic grid tables for fields configurations are optimized for standard screen readers.'
    },
    ar: {
      label: 'مدخلات JSON',
      description: 'يحدد هيكل مخطط البيانات والحدود للمتغيرات الواردة والنشطة في سير العمل.',
      properties: ['حقول المخطط (المفتاح، النوع، مطلوب)', 'قواعد التحقق من الصحة', 'نموذج بيانات JSON الواردة'],
      benefits: 'يضمن سلامة أنواع البيانات، مما يتيح للخطوات اللاحقة تحليل المعلمات بشكل موثوق ويمنع الأخطاء غير المتوقعة.',
      accessibility: 'جداول ديناميكية لتهيئة الحقول، تم تحسينها لسهولة التنقل عبر قارئات الشاشة.'
    }
  },
  {
    type: 'output',
    category: 'data',
    iconName: 'Sliders',
    en: {
      label: 'JSON Output',
      description: 'Structures the final outgoing response data that is sent back to trigger sources.',
      properties: ['Response Headers JSON', 'Body payload structure mapping', 'HTTP status code mapping'],
      benefits: 'Delivers highly formatted clean APIs. External applications receive exactly the parameters and formats they require.',
      accessibility: 'Input and dropdown fields are fully labeled and focusable using Tab keys.'
    },
    ar: {
      label: 'مخرجات JSON',
      description: 'يهيئ بيانات الاستجابة النهائية الصادرة التي يتم إرجاعها إلى نظام التشغيل أو التطبيق الخارجي.',
      properties: ['ترويسات الاستجابة (Headers)', 'تخطيط هيكل المخرجات', 'رمز حالة الاستجابة HTTP'],
      benefits: 'يوفر واجهات برمجية نظيفة ومنظمة للغاية، مما يضمن حصول التطبيقات الخارجية على القيم بالصيغة المطلوبة تماماً.',
      accessibility: 'حقول الإدخال والقوائم المنسدلة مصنفة بالكامل وقابلة للتركيز باستخدام لوحة المفاتيح.'
    }
  },
  {
    type: 'variable',
    category: 'data',
    iconName: 'Key',
    en: {
      label: 'Set Variable',
      description: 'Assigns values or expressions to workflow state memory keys, making them globally queryable by other nodes.',
      properties: ['Variable Key Name', 'Data Type (String, Number, Array, Object)', 'Value Expression Formula'],
      benefits: 'Allows dynamic state tracking, counting loops steps, accumulating sums, or passing authorization tokens between APIs.',
      accessibility: 'Keyboard inputs include rich validations to alert screen reader users of malformed key names.'
    },
    ar: {
      label: 'تعيين متغير Variable',
      description: 'يخصص قيماً أو معادلات لمنطقة الذاكرة الخاصة بسير العمل، مما يجعلها قابلة للاستخدام عالمياً من العقد الأخرى.',
      properties: ['اسم المفتاح للمتغير', 'نوع البيانات (نص، رقم، مصفوفة، كائن)', 'صيغة القيمة التعبيرية'],
      benefits: 'يتيح التتبع الديناميكي للحالة، وحساب التكرارات، وتراكم المجاميع، أو تمرير رموز التحقق الأمنية بين الواجهات.',
      accessibility: 'تتضمن حقول الإدخال التحققات الدقيقة لتنبيه مستخدمي قارئات الشاشة بالأسماء غير الصالحة للمتغيرات.'
    }
  },
  {
    type: 'transform',
    category: 'data',
    iconName: 'Activity',
    en: {
      label: 'Format Data',
      description: 'Transforms active workflow payloads from one structure to another using simple mapping expressions.',
      properties: ['Format Expression (JSONata/JS)', 'Map Fields schema', 'Output Variable label'],
      benefits: 'Translates payload formats between incompatible APIs instantly, cleaning data and stripping out unnecessary fields.',
      accessibility: 'Interactive textareas support full accessibility outlines and dark-contrast themes.'
    },
    ar: {
      label: 'تنسيق وتحويل البيانات',
      description: 'يحول بيانات سير العمل النشطة من هيكل إلى آخر باستخدام تعبيرات ومخططات تحويل مبسطة.',
      properties: ['تعبير التحويل (JSONata/JS)', 'مخطط تخطيط الحقول', 'تسمية متغير المخرجات'],
      benefits: 'يترجم هياكل البيانات بين الأنظمة والواجهات غير المتوافقة فوراً، مع تنظيف البيانات وإزالة الحقول غير الضرورية.',
      accessibility: 'تدعم مناطق النصوص التفاعلية إطارات التركيز عالية التباين وسمات العرض المظلمة.'
    }
  },
  {
    type: 'filter',
    category: 'data',
    iconName: 'Filter',
    en: {
      label: 'Filter List',
      description: 'Filters lists or object arrays by removing items that violate custom logical conditions.',
      properties: ['Target Array Name', 'Filter Criteria Rules', 'Output Array Name'],
      benefits: 'Cleanses data. Essential for narrowing user lists, selecting active subscriptions only, or screening out error logs.',
      accessibility: 'Rules inputs support perfect keyboard sorting and accessible alert flags.'
    },
    ar: {
      label: 'تصفية القائمة Filter',
      description: 'يقوم بتصفية القوائم أو مصفوفات الكائنات عن طريق إزالة العناصر التي لا تطابق الشروط المنطقية المحددة.',
      properties: ['اسم المصفوفة المستهدفة', 'قواعد شروط التصفية', 'اسم مصفوفة المخرجات المصفاة'],
      benefits: 'يقوم بتنقية وتطهير البيانات. ضروري لتقليص قوائم المستخدمين، أو استخراج الاشتراكات النشطة فقط، أو استبعاد السجلات التالفة.',
      accessibility: 'تدعم حقول الشروط الترتيب الكامل بلوحة المفاتيح وتوفر إشارات تنبيه واضحة لسهولة الوصول.'
    }
  },
  // --- 4. Integration Nodes ---
  {
    type: 'api_request',
    category: 'integration',
    iconName: 'Globe',
    en: {
      label: 'REST API Request',
      description: 'Executes standard external HTTP calls (GET, POST, PUT, DELETE) integrating third-party tools.',
      properties: ['HTTP Method', 'Target Endpoint URL', 'Request Headers JSON', 'Request Body parameters'],
      benefits: 'The ultimate utility to communicate with payment processors, external CRMs, AI providers, and custom databases.',
      accessibility: 'URL and Headers inputs support high-contrast outline themes and key navigation.'
    },
    ar: {
      label: 'طلب REST API',
      description: 'ينفذ اتصالات HTTP خارجية قياسية (GET, POST, PUT, DELETE) لربط وتكامل الأدوات والخدمات الخارجية.',
      properties: ['طريقة طلب HTTP', 'رابط نقطة النهاية المستهدفة', 'ترويسات الطلب (Headers JSON)', 'معلمات جسم الطلب'],
      benefits: 'الأداة الأقوى للاتصال ببوابات الدفع، أنظمة إدارة العملاء (CRM)، وموفري الذكاء الاصطناعي، وقواعد البيانات الخارجية.',
      accessibility: 'تدعم حقول إدخال الروابط والترويسات سمات التباين العالي والملاحة السريعة بلوحة المفاتيح.'
    }
  },
  {
    type: 'webhook',
    category: 'integration',
    iconName: 'Zap',
    en: {
      label: 'Webhook Trigger',
      description: 'Registers a dynamic, unique URL that listens for incoming HTTP JSON payloads in real time.',
      properties: ['Webhook URL (Auto-generated)', 'Allowed IP Addresses', 'Response Body Payload'],
      benefits: 'Enables instant events sync. It lets external platforms (e.g. Stripe checkout, GitHub pushes) trigger workflows instantly.',
      accessibility: 'One-click "Copy URL" button has distinct sound cues and visual accessibility focus boxes.'
    },
    ar: {
      label: 'مشغل Webhook',
      description: 'يسجل رابط URL فريداً وديناميكياً يستمع لطلبات HTTP JSON الواردة في الوقت الفعلي لتشغيل المهام.',
      properties: ['رابط Webhook (مولد تلقائياً)', 'عناوين IP المسموح بها', 'جسم الاستجابة المرجعة (Response)'],
      benefits: 'يتيح مزامنة الأحداث الفورية. يسمح للمنصات الخارجية (مثل Stripe أو GitHub) بتشغيل عمليات سير العمل فوراً.',
      accessibility: 'يحتوي زر "نسخ الرابط" بنقرة واحدة على إشارات بصرية مخصصة ومربعات تركيز للملاحة الميسرة.'
    }
  },
  {
    type: 'email',
    category: 'integration',
    iconName: 'Mail',
    en: {
      label: 'Send Email',
      description: 'Dispatches custom emails using secure SMTP or visual HTML templating to editors or clients.',
      properties: ['Recipient Email (To/Cc/Bcc)', 'Subject Title', 'Body content (HTML/Markdown support)', 'Attachment files list'],
      benefits: 'Perfect for welcome onboarding, receipt dispatches, alerts distributions, system notifications, or security token delivery.',
      accessibility: 'Inputs are built with standard accessibility attributes, guaranteeing seamless navigation via screen readers.'
    },
    ar: {
      label: 'إرسال بريد إلكتروني',
      description: 'يرسل رسائل بريد إلكتروني مخصصة باستخدام بروتوكول SMTP الآمن أو قوالب HTML المرئية إلى المحررين أو العملاء.',
      properties: ['البريد المستلم (إلى / نسخة / مخفية)', 'موضوع الرسالة', 'محتوى الرسالة (يدعم HTML/Markdown)', 'قائمة الملفات المرفقة'],
      benefits: 'مثالي لرسائل الترحيب، وإرسال الفواتير، وتوزيع التنبيهات الفورية، وإشعارات النظام، أو إيصال رموز الأمان.',
      accessibility: 'تم بناء الحقول مع سمات الوصول القياسية، مما يضمن كتابة خالية من العقبات لمستخدمي المساعدة.'
    }
  },
  {
    type: 'sms',
    category: 'integration',
    iconName: 'MessageSquare',
    en: {
      label: 'Send SMS',
      description: 'Sends instant SMS mobile texts to administrators or customers globally using integration gateways.',
      properties: ['Phone Number list', 'SMS message body', 'Sender ID label'],
      benefits: 'Ideal for critical outages, OTP verifications, shipping alerts, security violations, and dynamic multi-factor notifications.',
      accessibility: 'Inputs have numeric fields limitations to guarantee valid entries and easy screen reader focus.'
    },
    ar: {
      label: 'إرسال رسالة نصية SMS',
      description: 'يرسل نصوصاً برمجية فورية للهواتف المحمولة محلياً وعالمياً باستخدام بوابات إرسال الرسائل.',
      properties: ['قائمة أرقام الهواتف', 'محتوى الرسالة النصية', 'معرف المرسل'],
      benefits: 'مثالي لحالات الانقطاع الطارئة، رموز التحقق OTP، تنبيهات الشحن، خروقات الأمان، والمصادقة الثنائية.',
      accessibility: 'تتميز الحقول بحدود إدخال رقمية صارمة لضمان صحة الأرقام وسهولة التركيز بالصوت.'
    }
  },
  {
    type: 'database',
    category: 'integration',
    iconName: 'Database',
    en: {
      label: 'Query DB',
      description: 'Performs highly secure SQL select, insert, or update queries inside PostgreSQL, MySQL, or Mongo databases.',
      properties: ['Database Connection config', 'SQL Query string', 'Dynamic Bind parameters'],
      benefits: 'Allows workflows to query directly against internal custom logs, read dynamic user profiles, or store execution metadata.',
      accessibility: 'Editor implements advanced dark-contrast syntax highlight maps suitable for low-vision developers.'
    },
    ar: {
      label: 'الاستعلام عن قاعدة البيانات',
      description: 'ينفذ عمليات استعلام SQL آمنة (اختيار، إدراج، تعديل) داخل قواعد بيانات PostgreSQL أو MySQL أو Mongo.',
      properties: ['تهيئة اتصال قاعدة البيانات', 'نص استعلام SQL', 'المعلمات الديناميكية المربوطة'],
      benefits: 'يسمح لسير العمل بالاستعلام مباشرة من سجلات النظام الداخلية، أو قراءة ملفات تعريف الأعضاء، أو حفظ سجل العمليات.',
      accessibility: 'يتميز المحرر بخرائط تباين عالي لتوضيح التعليمات البرمجية لتناسب المطورين ضعاف البصر.'
    }
  },
  {
    type: 'google_sheets',
    category: 'integration',
    iconName: 'Layers',
    en: {
      label: 'Google Sheets',
      description: 'Appends rows, updates cells, or fetches tables from custom Google Spreadsheet files.',
      properties: ['Google Spreadsheet ID', 'Sheet Page Name', 'Row Data mapping JSON'],
      benefits: 'Allows non-technical teams to view workflow statistics, track signups, log customer requests, or compile reports.',
      accessibility: 'Authentication actions are guided with clear auditory prompts and high visual contrast cues.'
    },
    ar: {
      label: 'جوجل شيت Google Sheets',
      description: 'يضيف صفوفاً، أو يحدث خلايا، أو يجلب جداول من ملفات جداول بيانات جوجل المحددة.',
      properties: ['معرف ملف جداول البيانات', 'اسم ورقة العمل الفرعية', 'تخطيط بيانات الصفوف بتنسيق JSON'],
      benefits: 'يتيح للفرق غير التقنية استعراض إحصاءات سير العمل، أو تتبع الاشتراكات، أو تجميع تقارير الأداء بسهولة.',
      accessibility: 'خطوات ربط الحساب والمصادقة موجهة بإشارات صوتية ومرئية واضحة وعالية التباين.'
    }
  },
  // --- 5. Human Steps ---
  {
    type: 'form_step',
    category: 'human',
    iconName: 'FileText',
    en: {
      label: 'Wait for Form',
      description: 'Blocks workflow execution, sending a customized form link to compile human inputs in real time.',
      properties: ['Form Fields JSON definition', 'Form URL path', 'Expiry timeout duration', 'Assigned workspace role'],
      benefits: 'Gathers custom onboarding surveys, detailed feedback, human inputs, or complex requests safely.',
      accessibility: 'Generated customer forms strictly align with complete accessibility criteria including focus outlines and ARIA labels.'
    },
    ar: {
      label: 'انتظار ملء نموذج',
      description: 'يوقف تنفيذ سير العمل مؤقتاً، ويرسل رابط نموذج مخصص للمستلم لجمع مدخلات بشرية فورية.',
      properties: ['تعريف حقول النموذج JSON', 'مسار رابط النموذج', 'مدة انتهاء الصلاحية', 'الدور المخصص لمساحة العمل'],
      benefits: 'يجمع استطلاعات الرأي الخاصة بالانضمام، أو التعليقات التفصيلية، أو المدخلات المعقدة بشكل آمن وسهل.',
      accessibility: 'تتوافق النماذج الناتجة بشكل صارم مع معايير إمكانية الوصول الكاملة بما في ذلك إطارات التركيز وتسميات ARIA.'
    }
  },
  {
    type: 'approval',
    category: 'human',
    iconName: 'CheckCircle',
    en: {
      label: 'Wait for Approval',
      description: 'Blocks the automated execution sequence, dispatching a notification, until an Administrator signs in and approves.',
      properties: ['Assignee User ID', 'Timeout Action (Auto-Approve, Auto-Reject)', 'Message prompt instructions'],
      benefits: 'Crucial for financial payouts, admin review triggers, high-tier credit purchases, and manual sanity checks.',
      accessibility: 'Buttons are sized for perfect visual click compliance and support quick tab focus.'
    },
    ar: {
      label: 'انتظار الموافقة البشرية',
      description: 'يوقف تسلسل التنفيذ التلقائي، ويرسل إشعاراً بالمراجعة، حتى يقوم مسؤول بالدخول والموافقة على الخطوة.',
      properties: ['معرف المستخدم المسؤول', 'إجراء انتهاء المهلة (موافقة/رفض تلقائي)', 'تعليمات رسالة طلب الموافقة'],
      benefits: 'مهم جداً للمدفوعات المالية، ومراجعة المحتوى الحساس، وشراء الميزات المتقدمة، والفحوصات اليدوية الدقيقة.',
      accessibility: 'تم تصميم الأزرار بأحجام تضمن سهولة النقر ودعم التركيز السريع باستخدام لوحة المفاتيح.'
    }
  },
  {
    type: 'checklist',
    category: 'human',
    iconName: 'CheckSquare',
    en: {
      label: 'Checklist Step',
      description: 'Enforces human operators to complete a physical checklist series before advancing the flow.',
      properties: ['Checklist Items list', 'Enforce strict ordered completion', 'Completing Operator role'],
      benefits: 'Perfect for compliance tasks, deployment routines, quality control runs, and security audits.',
      accessibility: 'Checkboxes are fully key navigable using Spacebar and support loud state change notifications.'
    },
    ar: {
      label: 'خطوة قائمة المهام',
      description: 'يجبر المستخدمين أو الفاحصين على إتمام سلسلة من المهام وفحص قائمة التحقق قبل المتابعة.',
      properties: ['قائمة بنود المهام', 'فرض إكمال المهام بالترتيب', 'دور المشغل المسؤول عن الإكمال'],
      benefits: 'مثالية لمهام الامتثال والالتزام بالقوانين، وعمليات نشر الأنظمة، وضبط الجودة وفحوصات الأمان الدورية.',
      accessibility: 'صناديق الاختيار قابلة للتنقل بالكامل بمفتاح المسافة وتدعم إشعارات صوتية واضحة عند تغيير الحالة.'
    }
  },
  {
    type: 'signature',
    category: 'human',
    iconName: 'CheckCircle',
    en: {
      label: 'Sign Document',
      description: 'Requires users to append authenticated digital signatures or write freehand signoffs on visual documents.',
      properties: ['Document File source', 'Signature Placement coordinates', 'Required signer email'],
      benefits: 'Perfect for binding contracts, legal terms acceptance, employee agreements, and NDA forms approvals.',
      accessibility: 'Draw signatures support alternative keyboard text-entry signing options to satisfy accessible use.'
    },
    ar: {
      label: 'توقيع المستند',
      description: 'يتطلب من المستخدمين إضافة توقيعات رقمية معتمدة أو توقيع حر على وثائق العمل المرفقة.',
      properties: ['مصدر ملف المستند', 'إحداثيات وضع التوقيع', 'البريد الإلكتروني للموقع المطلوب'],
      benefits: 'مثالي للعقود الملزمة، وقبول البنود القانونية، واتفاقيات الموظفين الجدد، والموافقة على اتفاقيات عدم الإفصاح.',
      accessibility: 'يدعم رسم التوقيع خيارات كتابة بديلة عبر لوحة المفاتيح لتسهيل الاستخدام لجميع الفئات.'
    }
  },
  // --- 6. AI Features ---
  {
    type: 'ai_generate',
    category: 'ai',
    iconName: 'Zap',
    en: {
      label: 'AI Generate',
      description: 'Invokes Gemini or OpenAI to compile high-fidelity natural text responses or generate structured templates based on prompt inputs.',
      properties: ['System Prompt directive', 'User Context parameters', 'Temperature / Creativity rating', 'Max Tokens limit'],
      benefits: 'Automated content writing, auto-reply to customer support tickets, translate logs, or draft customized emails instantly.',
      accessibility: 'High contrast text fields, strict error state warnings, and screen reader-friendly parameters descriptions.'
    },
    ar: {
      label: 'توليد بالذكاء الاصطناعي',
      description: 'يستدعي نماذج Gemini أو OpenAI لتوليد نصوص طبيعية عالية الدقة أو صياغة قوالب مخصصة بناءً على التوجيهات.',
      properties: ['توجيهات النظام (System Prompt)', 'سياق المستخدم ومعاملاته', 'درجة الإبداع (Temperature)', 'الحد الأقصى للرموز'],
      benefits: 'أتمتة كتابة المحتوى، الرد التلقائي على تذاكر الدعم الفني، ترجمة السجلات، أو صياغة رسائل بريد مخصصة فوراً.',
      accessibility: 'حقول نصية ذات تباين عالٍ، تحذيرات حالة الخطأ الصارمة، وتوصيفات معلمات متوافقة مع قارئ الشاشة.'
    }
  },
  {
    type: 'ai_classify',
    category: 'ai',
    iconName: 'Bot',
    en: {
      label: 'AI Classify',
      description: 'Classifies raw input texts, files, or reviews into pre-set labels using advanced LLM reasoning.',
      properties: ['Input Text variable', 'Allowed Categories list', 'Confidence score threshold'],
      benefits: 'Auto-routes customer support tickets by category, filters positive vs negative comments, or tags logs instantly.',
      accessibility: 'Visual indicator badges have strong color-contrast and corresponding text descriptors for screen readers.'
    },
    ar: {
      label: 'تصنيف بالذكاء الاصطناعي',
      description: 'يصنف النصوص المدخلة أو المراجعات إلى فئات محددة مسبقاً باستخدام منطق نماذج اللغة الكبيرة.',
      properties: ['متغير النص المدخل', 'قائمة الفئات المسموح بها', 'عتبة درجة الثقة المطلوبة'],
      benefits: 'يوجه تذاكر الدعم الفني تلقائياً حسب نوعها، ويفرز التعليقات الإيجابية والسلبية، أو يصنف السجلات فوراً.',
      accessibility: 'تحتوي شارات الفئات المرئية على تباين لوني قوي وأوصاف نصية مرافقة لقارئات الشاشة.'
    }
  },
  {
    type: 'ai_extract',
    category: 'ai',
    iconName: 'Bot',
    en: {
      label: 'AI Extract',
      description: 'Parses unstructured plain texts or email contents to extract specific structured JSON entities (e.g. phone numbers, names, prices).',
      properties: ['Source Text variable', 'Extraction Schema JSON definition', 'Strict validation rules'],
      benefits: 'Automates customer data extraction from raw emails, parses resumes details, or extracts invoice statistics seamlessly.',
      accessibility: 'Extraction JSON fields display in highly readable structures with full keyboard focus support.'
    },
    ar: {
      label: 'استخراج بالذكاء الاصطناعي',
      description: 'يحلل النصوص غير المنظمة أو رسائل البريد لاستخراج حقول بيانات مهيأة (مثل أرقام الهواتف، الأسماء، التواريخ).',
      properties: ['متغير النص المصدر', 'مخطط الاستخراج بتنسيق JSON', 'قواعد التحقق الصارمة من النتائج'],
      benefits: 'يؤتمت جمع بيانات العملاء من رسائل البريد العشوائية، ويحلل السير الذاتية، أو يستخرج تفاصيل الفواتير بسلاسة.',
      accessibility: 'تعرض حقول بيانات الاستخراج في هياكل واضحة للغاية مع دعم كامل للتركيز بلوحة المفاتيح.'
    }
  },
  {
    type: 'ai_summarize',
    category: 'ai',
    iconName: 'Bot',
    en: {
      label: 'AI Summarize',
      description: 'Summarizes large files, chat threads, or custom documents into brief bullet points or paragraphs.',
      properties: ['Source Document path', 'Summary Format (Bullets, Short paragraph)', 'Max Length constraint'],
      benefits: 'Enables quick client digests, compiles executive transcripts summaries, and clarifies bulky document records.',
      accessibility: 'Outputs display inside clean focusable typography blocks optimized for all reading assistants.'
    },
    ar: {
      label: 'تلخيص بالذكاء الاصطناعي',
      description: 'يلخص الملفات الضخمة، أو محادثات العملاء، أو الوثائق المخصصة إلى نقاط رئيسية أو فقرات قصيرة موجزة.',
      properties: ['مسار المستند المصدر', 'تنسيق التلخيص (نقاط، فقرة قصيرة)', 'قيود الطول الأقصى للملخص'],
      benefits: 'يمكّن من إنشاء ملخصات سريعة للعملاء، وتلخيص محاضر الاجتماعات، وتوضيح المستندات القانونية الطويلة.',
      accessibility: 'تظهر المخرجات داخل كتل نصية قابلة للتركيز مصممة لتسهيل القراءة لكل المساعدين الصوتيين.'
    }
  },
  {
    type: 'ai_route',
    category: 'ai',
    iconName: 'Bot',
    en: {
      label: 'AI Smart Route',
      description: 'Dynamically branches workflow sequence paths depending on semantic analysis of incoming prompts or user queries.',
      properties: ['Decision Prompt instruction', 'Route Options and criteria', 'Semantic thresholds rating'],
      benefits: 'Routes user messages based on intent (e.g. billing questions route to billing, bugs route to engineers) intelligently.',
      accessibility: 'Visual flows charts represent branches clearly with accessible status updates read loud.'
    },
    ar: {
      label: 'توجيه ذكي بالذكاء الاصطناعي',
      description: 'يوجه مسارات سير العمل ديناميكياً بناءً على التحليل الدلالي لطلبات أو استفسارات المستخدمين.',
      properties: ['توجيه قرار المسار', 'خيارات المسارات وشروطها', 'عتبة التقييم الدلالي'],
      benefits: 'يوجه رسائل المستخدمين بناءً على نية السؤال (مثال: أسئلة الدفع تذهب للحسابات، والمشاكل التقنية للمهندسين).',
      accessibility: 'تمثل مخططات التدفق المرئية الفروع بوضوح مع تحديثات حالة متوافقة مع القراءة الصوتية.'
    }
  }
];

/* ─────────────────────── ACCESSIBILITY GUIDE ─────────────────────── */
const SHORTCUTS = [
  { key: 'V / S', en: 'Switch to Select tool (Whiteboard)', ar: 'التحويل لأداة التحديد (اللوحة)' },
  { key: 'P', en: 'Switch to Pen brush tool (Whiteboard)', ar: 'التحويل لأداة القلم الحر (اللوحة)' },
  { key: 'E', en: 'Switch to Eraser tool (Whiteboard)', ar: 'التحويل لأداة الممحاة (اللوحة)' },
  { key: 'Delete / Backspace', en: 'Delete selected whiteboard shape or workflow node', ar: 'حذف الشكل المختار أو العقدة المحددة' },
  { key: 'Ctrl + Z', en: 'Undo editing stroke or node movement', ar: 'تراجع عن حركة العقدة أو رسم اللوحة' },
  { key: 'Ctrl + Y', en: 'Redo editing stroke or node movement', ar: 'إعادة تطبيق الحركة أو الرسم' },
  { key: 'Esc', en: 'Close whiteboard canvas or clear active selection', ar: 'إغلاق اللوحة البيضاء أو إلغاء التحديد' },
  { key: 'Tab', en: 'Navigate through focusable editor items', ar: 'التنقل بين عناصر المحرر القابلة للتركيز' },
];

/* ─────────────────────── HELPERS FOR RENDERING ─────────────────────── */
function NodeIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case 'Zap': return <Zap className={className} />;
    case 'Play': return <Play className={className} />;
    case 'Square': return <Square className={className} />;
    case 'Activity': return <Activity className={className} />;
    case 'HelpCircle': return <HelpCircle className={className} />;
    case 'Layers': return <Layers className={className} />;
    case 'Globe': return <Globe className={className} />;
    case 'CheckCircle': return <CheckCircle className={className} />;
    case 'Mail': return <Mail className={className} />;
    case 'MessageSquare': return <MessageSquare className={className} />;
    case 'Database': return <Database className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'CheckSquare': return <CheckSquare className={className} />;
    case 'Bot': return <Bot className={className} />;
    case 'GitFork': return <GitFork className={className} />;
    case 'RefreshCw': return <RefreshCw className={className} />;
    case 'Sliders': return <Sliders className={className} />;
    case 'Filter': return <Filter className={className} />;
    default: return <HelpCircle className={className} />;
  }
}

const getIconColor = (iconName: string) => {
  switch (iconName) {
    case 'Zap': return 'text-fuchsia-400';
    case 'Play': return 'text-emerald-400';
    case 'Square': return 'text-rose-400';
    case 'Activity': return 'text-sky-400';
    case 'HelpCircle': return 'text-amber-400';
    case 'Layers': return 'text-indigo-400';
    case 'Globe': return 'text-purple-400';
    case 'CheckCircle': return 'text-pink-400';
    case 'Mail': return 'text-blue-400';
    case 'MessageSquare': return 'text-teal-400';
    case 'Database': return 'text-orange-400';
    case 'FileText': return 'text-yellow-400';
    case 'CheckSquare': return 'text-violet-400';
    case 'Bot': return 'text-red-400';
    case 'GitFork': return 'text-lime-400';
    case 'RefreshCw': return 'text-cyan-400';
    case 'Sliders': return 'text-emerald-500';
    case 'Filter': return 'text-amber-500';
    default: return 'text-zinc-400';
  }
};

/* ─────────────────────── HELP PAGE COMPONENT ─────────────────────── */
export default function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isRtl = locale === 'ar';

  /* ── State ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeArticleId, setActiveArticleId] = useState<string | null>('canvas_editor');
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);

  /* ── Computed Filtered Nodes ── */
  const filteredNodes = useMemo(() => {
    return NODE_CATALOG.filter((node) => {
      const label = isRtl ? node.ar.label : node.en.label;
      const desc = isRtl ? node.ar.description : node.en.description;
      const matchesSearch = 
        label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        desc.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, isRtl]);

  const categories = [
    { id: 'all', en: 'All Nodes', ar: 'كل العقد' },
    { id: 'board', en: 'Whiteboard', ar: 'اللوحة التشاركية' },
    { id: 'basic', en: 'Basic', ar: 'الأساسية' },
    { id: 'logic', en: 'Logic', ar: 'المنطق والشرط' },
    { id: 'data', en: 'Data', ar: 'البيانات والمصفوفات' },
    { id: 'integration', en: 'Integration', ar: 'الربط الخارجي' },
    { id: 'human', en: 'Human Steps', ar: 'الخطوات البشرية' },
    { id: 'ai', en: 'AI Features', ar: 'الذكاء الاصطناعي' },
  ];

  const activeArticle = useMemo(() => {
    return SYSTEM_ARTICLES.find((a) => a.id === activeArticleId) || SYSTEM_ARTICLES[0];
  }, [activeArticleId]);

  return (
    <div className="space-y-10 animate-fadeIn max-w-6xl mx-auto font-sans pb-16 text-foreground leading-normal" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* ─── Premium Glassmorphic Header ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-linear-to-r from-zinc-950 via-zinc-900 to-indigo-950/20 p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-left rtl:text-right">
            <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[10px] font-bold tracking-widest px-3 py-1 rounded-full mb-1">
              {isRtl ? 'مركز المعرفة والمساعدة' : 'Knowledge & Help Center'}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {isRtl ? 'كيف يمكننا مساعدتك اليوم؟' : 'How can we help you today?'}
            </h1>
            <p className="text-sm font-light text-zinc-400">
              {isRtl 
                ? 'استكشف أدلة النظام المتكاملة، وتعرّف على عقد مخططات العمل وخصائصها، وتعلم كيفية تعظيم كفاءة تدفقاتك الإبداعية.' 
                : 'Explore comprehensive system articles, learn about custom workflow nodes, and master accessibility tools to maximize your platform efficiency.'}
            </p>
          </div>
          
          {/* Quick Back button to dashboard */}
          <Link href={`/${locale}/dashboard`} passHref>
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-2xl cursor-pointer text-xs font-bold shrink-0 self-start md:self-auto gap-2 py-5 px-5 shadow-sm">
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {isRtl ? 'العودة للوحة التحكم' : 'Return to Dashboard'}
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── SECTION 1: Core System Features Directory ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left list of Articles */}
        <div className="lg:col-span-1 space-y-3">
          <div className="px-1 text-left rtl:text-right">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground/80">
              {isRtl ? 'أدلة النظام الأساسية' : 'System Feature Guides'}
            </h3>
          </div>
          
          {SYSTEM_ARTICLES.map((article) => {
            const isActive = article.id === activeArticleId;
            const title = isRtl ? article.ar.title : article.en.title;
            const desc = isRtl ? article.ar.description : article.en.description;

            return (
              <button
                key={article.id}
                onClick={() => setActiveArticleId(article.id)}
                className={`w-full text-left rtl:text-right p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-4 hover:shadow-xs select-none ${
                  isActive 
                    ? 'bg-linear-to-r from-zinc-900 to-zinc-900/40 border-primary/50 ring-2 ring-primary/10 shadow-sm' 
                    : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/50'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? 'bg-primary/20 text-primary' : 'bg-zinc-950 text-zinc-500 border border-zinc-800'}`}>
                  {article.iconName === 'Layers' && <Layers className="w-5 h-5" />}
                  {article.iconName === 'Zap' && <Zap className="w-5 h-5" />}
                  {article.iconName === 'Users' && <Users className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{title}</h4>
                  <p className="text-xs font-light text-muted-foreground mt-1 line-clamp-2">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Active Article details */}
        <Card className="lg:col-span-2 bg-zinc-900/35 border-border/80 rounded-3xl backdrop-blur-xs p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full filter blur-2xl pointer-events-none" />
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground">
                {isRtl ? activeArticle.ar.title : activeArticle.en.title}
              </h2>
            </div>
            
            <p className="text-sm font-light text-muted-foreground border-b border-border/60 pb-4">
              {isRtl ? activeArticle.ar.description : activeArticle.en.description}
            </p>

            <div className="space-y-4">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground/80">
                {isRtl ? 'خطوات الاستخدام والتفاصيل' : 'Step-By-Step Instructions'}
              </h4>
              <div className="space-y-3">
                {(isRtl ? activeArticle.ar.steps : activeArticle.en.steps).map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start text-sm">
                     <span className="w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] font-bold text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {idx + 1}
                    </span>
                    <p className="text-zinc-300 font-light pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── SECTION 2: Dynamic Custom Nodes Catalog ─── */}
      <div className="space-y-6">
        <div className="border-t border-border/60 pt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left rtl:text-right">
            <h2 className="text-2xl font-extrabold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {isRtl ? 'دليل ودستور عقد النظام' : 'Workflow Nodes Catalog Directory'}
            </h2>
            <p className="text-xs font-light text-muted-foreground mt-1">
              {isRtl 
                ? 'استخدم البحث السريع وعلامات التبويب لتصفح كل عقدة على حدة، واقرأ خصائصها وكيفية عملها ونقاط قوتها.' 
                : 'Filter and search node models. Highlight any card to inspect active parameters, validation rules, and tips.'}
            </p>
          </div>

          {/* Premium Search input */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'ابحث عن عقدة (مثال: اللوحة، قرار)...' : 'Search nodes (e.g. Whiteboard, API)...'}
              className="ps-10 rounded-2xl border-border/80 bg-zinc-900/30 py-5 focus:ring-primary shadow-xs font-sans text-xs"
            />
          </div>
        </div>

        {/* Premium Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-4 overflow-x-auto whitespace-nowrap">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                selectedCategory === c.id
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-102 font-extrabold'
                  : 'bg-zinc-900/30 border border-zinc-900 text-muted-foreground hover:bg-zinc-900/60 hover:text-white'
              }`}
            >
              {isRtl ? c.ar : c.en}
            </button>
          ))}
        </div>

        {/* Dynamic Nodes Grid */}
        {filteredNodes.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border/80 rounded-3xl bg-zinc-900/5 backdrop-blur-xs">
            <HelpCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold font-sans">
              {isRtl ? 'لم يتم العثور على عقد مطابقة' : 'No matching nodes found'}
            </h3>
            <p className="text-xs text-muted-foreground font-light mt-1">
              {isRtl ? 'حاول تعديل كلمة البحث أو فلتر التصنيفات.' : 'Try adjusting your search keywords or switching filter categories.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNodes.map((node) => {
              const label = isRtl ? node.ar.label : node.en.label;
              const desc = isRtl ? node.ar.description : node.en.description;
              const categoryLabel = categories.find((c) => c.id === node.category)?.[isRtl ? 'ar' : 'en'] || node.category;

              return (
                <button
                  key={node.type}
                  onClick={() => setSelectedNode(node)}
                  className="w-full text-left rtl:text-right rounded-3xl border border-border/60 bg-zinc-900/20 hover:bg-zinc-900/40 p-5 cursor-pointer shadow-xs select-none hover:shadow-md hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group h-full"
                >
                  <div className="space-y-4 w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <Badge className="bg-zinc-950/60 text-muted-foreground font-semibold text-[10px] capitalize border border-border/40 px-2 py-0.5 rounded-md">
                        {categoryLabel}
                      </Badge>
                      <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                        <NodeIcon name={node.iconName} className={`w-4 h-4 ${getIconColor(node.iconName)}`} />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1.5 text-left rtl:text-right">
                      <h4 className="font-extrabold text-sm text-foreground font-sans tracking-tight">{label}</h4>
                      <p className="text-xs font-light text-muted-foreground line-clamp-3 leading-relaxed">{desc}</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-primary group-hover:text-primary-hover font-bold inline-flex items-center gap-1 mt-4 pt-3 border-t border-border/40 w-full text-left rtl:text-right">
                    {isRtl ? 'عرض تفاصيل الخصائص' : 'View parameters & tips'}
                    {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION 3: Accessibility Hub ─── */}
      <div className="border-t border-border/60 pt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: General accessibility overview */}
        <div className="space-y-6 text-left rtl:text-right">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {isRtl ? 'إمكانية الوصول والاندماج' : 'Accessibility & Inclusive Features'}
            </h2>
            <p className="text-xs font-light text-muted-foreground">
              {isRtl 
                ? 'ندعم أعلى معايير سهولة الوصول والوصول الشامل لجميع المطورين بمختلف متطلباتهم.' 
                : 'We prioritize inclusive design, supporting comprehensive keyboard bindings, screen readers, and RTL support.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/20 border border-border/50 space-y-2">
              <Eye className="w-5 h-5 text-sky-400" />
              <h4 className="font-bold text-xs">{isRtl ? 'تباين عالي للمظهر' : 'High-Contrast Themes'}</h4>
              <p className="text-[10px] font-light text-muted-foreground">
                {isRtl 
                  ? 'تم تحسين المظهر الداكن والخفيف بتباين يسهل قراءة التبويبات وخطوط الأشكال لأصحاب صعوبات الرؤية.' 
                  : 'Dynamic light & dark palettes configured with high color contrast for screen readabilities.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/20 border border-border/50 space-y-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-xs">{isRtl ? 'ثنائية اللغة والاتجاه' : 'Native RTL/Arabic Support'}</h4>
              <p className="text-[10px] font-light text-muted-foreground">
                {isRtl 
                  ? 'ندعم اللغة العربية بالكامل مع قلب اتجاهات اللوحة والشريط الجانبي والأزرار لتجربة مستخدم طبيعية وسلسة.' 
                  : 'Full Arabic support with bidirectional flipping of sidebars, navigation panels, and interactive layers.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/20 border border-border/50 space-y-2">
              <Keyboard className="w-5 h-5 text-fuchsia-400" />
              <h4 className="font-bold text-xs">{isRtl ? 'تحكم كامل بلوحة المفاتيح' : 'Keyboard Navigation'}</h4>
              <p className="text-[10px] font-light text-muted-foreground">
                {isRtl 
                  ? 'يمكنك التنقل بين عناصر المحرر، وحذف الأشكال، والنسخ والتراجع بالكامل باستخدام الاختصارات دون الحاجة للفأرة.' 
                  : 'Navigate flow nodes, delete highlights, and edit properties easily using keyboard bindings.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/20 border border-border/50 space-y-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-xs">{isRtl ? 'توافق قارئ الشاشة' : 'Screen Reader Friendly'}</h4>
              <p className="text-[10px] font-light text-muted-foreground">
                {isRtl 
                  ? 'تحتوي جميع العقد التفاعلية على نصوص واصفة وتنبيهات منطقية يتم قراءتها آلياً لسهولة التحكم.' 
                  : 'ARIA descriptors, logical labels, and status announcements parsed perfectly for screen-readers.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Keyboard Shortcuts Cheatsheet Table */}
        <Card className="bg-zinc-900/35 border-border/80 rounded-3xl backdrop-blur-xs p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-sm text-foreground">
              {isRtl ? 'اختصارات لوحة المفاتيح الهامة' : 'Essential System Keyboard Shortcuts'}
            </h3>
          </div>
          
          <div className="divide-y divide-border border border-border/60 rounded-2xl overflow-hidden bg-zinc-950/20">
            {SHORTCUTS.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 text-xs gap-3">
                <span className="text-zinc-300 font-light text-left rtl:text-right">{isRtl ? s.ar : s.en}</span>
                <kbd className="px-2.5 py-1 text-[10px] font-mono font-bold bg-zinc-950 border border-zinc-800 text-primary rounded-md shadow-xs shrink-0 select-all">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ─── MODAL DRAWER FOR NODE DETAILS ─── */}
      {selectedNode && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" onClick={() => setSelectedNode(null)}>
          <Card 
            className="max-w-xl w-full bg-zinc-900 border-border/90 rounded-3xl shadow-2xl relative p-6 space-y-6 text-left rtl:text-right overflow-y-auto max-h-[90vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md mb-1.5">
                  {categories.find((c) => c.id === selectedNode.category)?.[isRtl ? 'ar' : 'en'] || selectedNode.category}
                </Badge>
                <CardTitle className="text-xl font-extrabold text-foreground font-sans">
                  {isRtl ? selectedNode.ar.label : selectedNode.en.label}
                </CardTitle>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-primary shrink-0">
                <NodeIcon name={selectedNode.iconName} className={`w-5 h-5 ${getIconColor(selectedNode.iconName)}`} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 text-left rtl:text-right">
              <h5 className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground/80">
                {isRtl ? 'الوصف ووظيفة العقدة' : 'Node Function Description'}
              </h5>
              <p className="text-xs font-light text-zinc-300 leading-relaxed">
                {isRtl ? selectedNode.ar.description : selectedNode.en.description}
              </p>
            </div>

            {/* Config Properties */}
            <div className="space-y-2 text-left rtl:text-right">
              <h5 className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground/80">
                {isRtl ? 'أبرز معلمات الخصائص والتهيئة' : 'Key Configuration Parameters'}
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {(isRtl ? selectedNode.ar.properties : selectedNode.en.properties).map((prop, idx) => (
                  <Badge key={idx} variant="outline" className="bg-zinc-950 border-zinc-800 text-zinc-400 text-[10px] font-medium px-2.5 py-1 rounded-lg">
                    {prop}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Use Case / Benefits */}
            <div className="space-y-1.5 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-left rtl:text-right">
              <h5 className="text-[10px] uppercase font-extrabold tracking-wider text-primary mb-1">
                {isRtl ? 'نقاط القوة والاستفادة القصوى' : 'Best Practice & Maximizing Benefits'}
              </h5>
              <p className="text-xs font-light text-zinc-300 leading-relaxed">
                {isRtl ? selectedNode.ar.benefits : selectedNode.en.benefits}
              </p>
            </div>

            {/* Accessibility details */}
            <div className="space-y-1.5 text-left rtl:text-right">
              <h5 className="text-[10px] uppercase font-extrabold tracking-wider text-muted-foreground/80 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-zinc-500" />
                {isRtl ? 'إرشادات الوصول المخصصة للعقدة' : 'Specific Accessibility Directives'}
              </h5>
              <p className="text-xs font-light text-zinc-400">
                {isRtl ? selectedNode.ar.accessibility : selectedNode.en.accessibility}
              </p>
            </div>

            {/* Bottom buttons */}
            <div className="pt-4 border-t border-border/60 flex justify-end">
              <Button 
                onClick={() => setSelectedNode(null)} 
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 py-4 cursor-pointer"
              >
                {isRtl ? 'إغلاق الدليل' : 'Dismiss Guide'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
