
import type { Objective } from '@/types/okr';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyResultDisplay } from './KeyResultDisplay';
import { Target, Edit3, CalendarCheck2, ChevronDown, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ObjectiveCardProps {
  objective: Objective;
  teamName?: string;
  onEdit: (objective: Objective) => void;
  onCheckIn: (objective: Objective) => void;
}

export function ObjectiveCard({ objective, teamName, onEdit, onCheckIn }: ObjectiveCardProps) {
  const [openKeyResult, setOpenKeyResult] = React.useState<string | undefined>(objective.keyResults.length > 0 ? `kr-${objective.keyResults[0].id}` : undefined);
  
  return (
    <Card className="mb-6 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden">
      <CardHeader className="bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            <Target className="w-10 h-10 text-primary flex-shrink-0" />
            <div className="flex-grow min-w-0">
              <CardTitle className="text-xl font-headline font-semibold text-primary break-words">{objective.description}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                <span>{objective.keyResults.length} نتیجه کلیدی</span>
                {teamName && (
                    <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {teamName}
                    </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-col sm:flex-row">
            <Button variant="outline" size="sm" onClick={() => onEdit(objective)} className="w-full sm:w-auto">
              <Edit3 className="w-4 h-4 ml-2" /> ویرایش
            </Button>
            <Button variant="default" size="sm" onClick={() => onCheckIn(objective)} className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
              <CalendarCheck2 className="w-4 h-4 ml-2" /> ثبت پیشرفت
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 bg-background/50">
        {objective.keyResults.length > 0 ? (
           <Accordion type="single" collapsible className="w-full space-y-3" value={openKeyResult} onValueChange={setOpenKeyResult}>
            {objective.keyResults.map((kr) => (
              <AccordionItem value={`kr-${kr.id}`} key={kr.id} className="border bg-card rounded-lg shadow-sm overflow-hidden">
                <AccordionTrigger className="p-4 hover:no-underline focus:no-underline hover:bg-secondary/30 data-[state=open]:bg-secondary/30">
                  <div className="flex justify-between items-center w-full">
                    <span className="font-medium text-foreground text-sm sm:text-base flex-grow break-words pl-2 text-right">{kr.description}</span>
                    <div className="flex items-center flex-shrink-0">
                      <span className="text-sm text-muted-foreground ml-4">{kr.progress}%</span>
                       {kr.assignees && kr.assignees.length > 0 && (
                          <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden mr-2">
                             <TooltipProvider delayDuration={100}>
                              {kr.assignees.slice(0, 3).map(assignee => (
                                <Tooltip key={assignee.id}>
                                  <TooltipTrigger asChild>
                                    <Avatar className="h-6 w-6 border-2 border-background">
                                      {assignee.avatarUrl && <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />}
                                      <AvatarFallback>{assignee.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{assignee.name}</p></TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
                          </div>
                        )}
                      <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 accordion-chevron ml-2" />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t bg-card">
                   <KeyResultDisplay keyResult={kr} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-md">
            هنوز نتیجه کلیدی برای این هدف تعریف نشده است. برای افزودن، روی «ویرایش» کلیک کنید.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
