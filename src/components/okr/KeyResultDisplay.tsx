
'use client';

import React from 'react';
import type { KeyResult, Risk } from '@/types/okr';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { InitiativeDisplay } from './InitiativeDisplay';
import { ListChecks, Zap, Smile, Meh, Frown, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { ConfidenceLevel, RiskStatus } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MAPPED_CONFIDENCE_LEVELS, MAPPED_RISK_STATUSES } from '@/lib/constants';

interface KeyResultDisplayProps {
  keyResult: KeyResult;
}

const confidenceMeta: Record<ConfidenceLevel, { icon: React.ElementType, indicatorClass: string, textClass: string }> = {
  'HIGH': { icon: Smile, indicatorClass: 'bg-green-500', textClass: 'text-green-600' },
  'MEDIUM': { icon: Meh, indicatorClass: 'bg-yellow-500', textClass: 'text-yellow-600' },
  'LOW': { icon: Frown, indicatorClass: 'bg-orange-500', textClass: 'text-orange-600' },
  'AT_RISK': { icon: AlertTriangle, indicatorClass: 'bg-red-500', textClass: 'text-red-600' },
};

const riskStatusStyles: Record<RiskStatus, string> = {
  'ACTIVE': 'bg-red-100 text-red-700 border-red-300',
  'UNDER_REVIEW': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'RESOLVED': 'bg-green-100 text-green-700 border-green-300',
};

function RiskDisplay({ risk }: { risk: Risk }) {
  const badgeClass = riskStatusStyles[risk.status] || riskStatusStyles['ACTIVE'];
  return (
    <div className="flex flex-col gap-2 p-2.5 bg-red-500/5 rounded-md border border-destructive/20">
        <div className="flex items-center justify-between">
            <p className="text-sm text-foreground font-medium">{risk.description}</p>
            <Badge variant="outline" className={cn("text-xs font-medium px-2 py-0.5", badgeClass)}>{MAPPED_RISK_STATUSES[risk.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground pl-5 border-r-2 border-destructive/50 pr-2">
            <span className="font-semibold text-foreground">اقدام اصلاحی:</span> {risk.correctiveAction}
        </p>
    </div>
  );
}

function KeyResultDisplayComponent({ keyResult }: KeyResultDisplayProps) {
  const confidence = confidenceMeta[keyResult.confidenceLevel];
  const ConfidenceIcon = confidence.icon;

  return (
    <Card className="mb-0 shadow-none border-none_ bg-transparent_">
      <CardHeader className="pb-2 pt-1 px-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-grow min-w-0">
            <ListChecks className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div className="flex-grow">
              <CardTitle className="text-base font-medium text-foreground">{keyResult.description}</CardTitle>
              {keyResult.assignees && keyResult.assignees.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden">
                    <TooltipProvider delayDuration={100}>
                      {keyResult.assignees.map(assignee => (
                        <Tooltip key={assignee.id}>
                          <TooltipTrigger asChild>
                            <Avatar className="h-6 w-6 border-2 border-card">
                              {assignee.avatarUrl && <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />}
                              <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{assignee.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
             <ConfidenceIcon className={cn("w-5 h-5", confidence.textClass)} />
            <Badge variant="outline" className={cn("text-xs border-current", confidence.textClass)}>{MAPPED_CONFIDENCE_LEVELS[keyResult.confidenceLevel]}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2 px-1">
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>پیشرفت</span>
            <span>{keyResult.progress}%</span>
          </div>
          <Progress value={keyResult.progress} className="h-2.5 rounded-full" indicatorClassName={cn("rounded-full", confidence.indicatorClass)} />
        </div>
        
        <Accordion type="multiple" className="w-full -mx-1 space-y-1">
          {keyResult.initiatives.length > 0 && (
            <AccordionItem value="initiatives" className="border-none">
              <AccordionTrigger className="text-xs font-medium py-1.5 px-1 hover:no-underline hover:bg-secondary/50 rounded-md [&[data-state=open]>svg]:text-accent">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                  {keyResult.initiatives.length} اقدام
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0 pl-1 pr-1">
                <div className="space-y-1.5">
                  {keyResult.initiatives.map(initiative => (
                    <InitiativeDisplay key={initiative.id} initiative={initiative} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {keyResult.risks && keyResult.risks.length > 0 && (
            <AccordionItem value="risks" className="border-none">
              <AccordionTrigger className="text-xs font-medium py-1.5 px-1 hover:no-underline hover:bg-secondary/50 rounded-md [&[data-state=open]>svg]:text-destructive">
                 <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                    {keyResult.risks.length} ریسک شناسایی شده
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0 pl-1 pr-1">
                <div className="space-y-1.5">
                  {keyResult.risks.map(risk => (
                    <RiskDisplay key={risk.id} risk={risk} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}

export const KeyResultDisplay = React.memo(KeyResultDisplayComponent);
